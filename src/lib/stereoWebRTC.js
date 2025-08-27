import * as React from 'react'
import Head from 'next/head';
import Script from 'next/script';
import 'aframe'
import Sora from "sora-js-sdk";
import { AppMode } from '../app/appmode';
import {userUUID} from './cookie_id';


import package_info from '../../package.json' // load version
const codeType = package_info.name; // software name
const version = package_info.version; // version number

//const set_RealSense = true; //realsenseを使う場合はtrueにする
const set_Audio = false;     //audioを使う場合はtrueにする

let sora_once = true; // soraの初期化を一度だけ行うためのフラグ

let lastStatTime = 0;
let lastStatBytes = 0;


export default function StereoVideo(props) {
    const { rendered, stereo_visible, set_rtcStats,appmode } = props
    const [objectRender, setObjectRender] = React.useState(false)
    const set_RealSense = (appmode === AppMode.withDualCam || appmode === AppMode.monitor); //realsenseを使う場合はtrueにする


    // statsReport 定期的に更新
    async function setStatsReport(soraConnection) {
        if (soraConnection.pc && soraConnection.pc?.iceConnectionState !== 'closed') {
            const stats = await soraConnection.pc.getStats()
            const statsReport = []
            const localCandidateStats = []
            for (const stat of stats.values()) {
                if (stat.type === "codec"){
                    statsReport.push("codec: "+ stat.mimeType + "   type: " + stat.payloadType)
                }else if (stat.type === "inbound-rtp" ) {
                    statsReport.push(stat.frameWidth+"x"+stat.frameHeight + "  " + stat.framesPerSecond+ " fps");
                   
                }else if (stat.type === "transport" ) {
                    const tdiff = stat.timestamp - lastStatTime; 
                    const bdiff = stat.bytesReceived - lastStatBytes;
                    statsReport.push( Math.round(bdiff/ tdiff*80)/10  + " kbps");
                    lastStatTime = stat.timestamp;
                    lastStatBytes = stat.bytesReceived;
                }
                // RTCStatsReport の各統計情報を statsReport に追
//                statsReport.push(stat)
//                console.log('stats report', stat)
            }
            // local-candidate の最初に出現する TURN サーバーの URL を取得
//            console.log('setStatsReport', statsReport)
            set_rtcStats(statsReport)
        }
    }


    //ビデオ登録
    React.useEffect(() => {
        if (sora_once && objectRender) {
            console.log("Using sora-js-sdk version:", Sora.version());
            //const signalingUrl = 'wss://sora.uclab.jp/signaling'; //demo用
            const signalingUrl = 'wss://sora3.uclab.jp/signaling'; // 202508 demo用
//            const signalingUrl = 'wss://sora2.uclab.jp/signaling'; // 202508 demo用
            const channelId = 'paichi-vr180';
            const channelId1 = 'paichi-hand';
            const audioChannelId = 'uclab-audio'; // 202508 のdemo では、使わない予定
            const sora = Sora.connection(signalingUrl);
            const bundleId = 'vrdemo-sora-bundle';

            const options = {
                role: 'recvonly',
                multistream: true,
                video: {
                    codecType: 'H265',
                    resolution: '4K',
                    bitrate: 4000
                },
                audio: false,
            };
            const metadata = {
                codeType: codeType,
                version: version,
                bundleId: userUUID,
            }

            sora_once = false;

            const recvonly = sora.recvonly(channelId, metadata, options);
            const remoteVideo = document.getElementById('remotevideo');

            recvonly.on('disconnect', (event) => {
                console.log("Disconnected from sora:", event);

            });
            recvonly.on("removetrack", (event) => {
                console.log("Track removed from sora:", event);
                if (event.target instanceof MediaStream) {
                    // ここにトラック削除イベントの処理を書く
                    console.log("MediaStream track removed:", event.target);
                }
            });
            recvonly.on('push', (message, transportType) => {
                console.log("Push event from sora:", message, transportType);
                
            });
            recvonly.on('notify', (message, transportType) => {
                console.log("Notify Event from sora:", message, transportType);
                
            });
            recvonly.on('timeout', () => {
                console.log("Timeout Event from sora:", event);
                
            });
            recvonly.on('message', (message) => {
                console.log("Message Event from sora:", message.label, message.data);
                
            });
            recvonly.on('datachannel', (event) => {
                console.log("Datachannel Event from sora:", event.datachannel.label, event.datachannel.direction);
                
            });
            recvonly.on('signaling', (event) => {
//                console.log("Signaling Event from sora:", event);
                
            });
            recvonly.on('timeline', (event) => {
//                console.log("Timeline Event from sora:", event);              
            });
            

            recvonly.on('track', event => {
                if (event.track.kind === 'video') {
                    const mediaStream = new MediaStream();
                    mediaStream.addTrack(event.track);
                    remoteVideo.muted = true; // これで自動再生OKに！
                    remoteVideo.srcObject = mediaStream;
                    remoteVideo.play().then(() => {
                        //                        const playButton = document.querySelector('#videoPlayButton');
                        //                        playButton.setAttribute('visible', 'false')
                    })

                    console.log('MediaStream assigned to srcObject:', remoteVideo.srcObject);

                    remoteVideo.onloadeddata = () => {
                        console.log('Video data loaded');

                        const scene = document.querySelector('a-scene');
/*                        scene.addEventListener('loaded', () => {
//                            console.log('Scene fully loaded');

                            const leftSphere = document.getElementById('leftSphere');
                            const rightSphere = document.getElementById('rightSphere');

                            if (leftSphere && rightSphere) {
                                leftSphere.setAttribute('material', { src: '#remotevideo' });
                                rightSphere.setAttribute('material', { src: '#remotevideo' });

                                console.log('Left sphere material component:', leftSphere.components.material);
                                console.log('Right sphere material component:', rightSphere.components.material);
                            } else {
                                console.error('Left or right sphere not found in the DOM');
                            }

  //                      });
  */
                    };
                }
            });
            recvonly.connect().then(() => {
//                console.log('Successfully connected to Sora for main stereo');
                // start cheking stats
                setInterval(() => {
                    setStatsReport(recvonly);

                    // もし切断されていたら？というチェックは？
                }, 1000);

            }).catch(err => {
                console.error('Sora connection error for main stereo:', err);
            });




            if (set_RealSense) {// no realsense
                const options = {
                    role: 'recvonly',
                    multistream: true,
                    video: {
                        codecType: 'H265',
                        resolution: 'VGA',
                        bitrate: 1000
                    },
                    audio: false,
                };

                const metadata = {
                    codeType: codeType,
                    version: version,
                    bundleId: userUUID,
                }
                const recvonly1 = sora.recvonly(channelId1, metadata, options);
                const remoteVideo1 = document.getElementById('remotevideo-realsense');
                recvonly1.on('track', event => {
                    if (event.track.kind === 'video') {
                        const mediaStream = new MediaStream();
                        mediaStream.addTrack(event.track);
                        remoteVideo1.muted = true; // これで自動再生OKに！
                        remoteVideo1.srcObject = mediaStream;
                        remoteVideo1.play().then(() => {
//                            console.log("play realsense")
                        })

                        console.log('MediaStream assigned to srcObject:', remoteVideo1.srcObject);

                        remoteVideo1.onloadeddata = () => {
//                            console.log('Video data loaded');

                            const scene = document.querySelector('a-scene');
                            scene.addEventListener('loaded', () => {
//                                console.log('Scene fully loaded');

                                if (set_RealSense) {
                                    const plate = document.getElementById('videoPlate');
                                    plate.setAttribute('material', { src: '#remotevideo-realsense' });
                                }

                            });
                        };
                    }
                });
                recvonly1.connect().then(() => {
//                    console.log('Successfully connected to Sora');
                }).catch(err => {
                    console.error('Sora connection error:', err);
                });
            }

            if (set_Audio) {
                const audioOptions = {
                    role: 'sendrecv',
                    multistream: true,
                    //bundleId: bundleId,
                    video: false,
                    audio: true,
                    enabledMetadata: true
                };

                let localStream

                navigator.mediaDevices.getUserMedia({ audio: true, video: false })
                    .then(stream => {

                        localStream = stream;
                        const audioTracks = stream.getAudioTracks();
                        console.log('Local audio tracks:', audioTracks);
                        audioTracks.forEach(track => {
                            console.log('Audio track settings:', track.getSettings());
                            console.log('Audio track enabled:', track.enabled);
                            console.log('Audio track muted:', track.muted);
                        });
                        const audioSendRecv = sora.sendrecv(audioChannelId, null, audioOptions);

                        audioSendRecv.on('log', (msg) => {
                            console.log('Sora log:', msg);
                        });

                        // Peerイベントの監視
                        audioSendRecv.on('peerLeave', (peerId) => {
                            console.log('Peer left:', peerId);
                        });

                        audioSendRecv.on('peerJoin', (peerId) => {
                            console.log('Peer joined:', peerId);
                        });

                        audioSendRecv.on('track', event => {
                            console.log('Track event received:', event);
                            console.log('Track type:', event.track.kind);
                            console.log('Track ID:', event.track.id);
                            console.log('Track enabled:', event.track.enabled);
                            console.log('Track readyState:', event.track.readyState);
                            if (event.track.kind === 'audio') {

                                console.log('Audio track enabled:', event.track.enabled);
                                console.log('Audio track readyState:', event.track.readyState);

                                const audioStream = new MediaStream();
                                audioStream.addTrack(event.track);

                                const audioElement = document.createElement('audio');
                                audioElement.srcObject = audioStream;
                                audioElement.autoplay = true;
                                audioElement.style.display = "none"; // 表示を非表示に
                                document.body.appendChild(audioElement); // AudioエレメントをDOMに追加

                                // Audioの再生
                                audioElement.play().then(() => {
                                    console.log('Audio started playing');
                                }).catch(error => {
                                    console.error('Error playing audio:', error);
                                });
                            }
                        });

                        audioSendRecv.on('notify', message => {
                            console.log('Notify received:', message);
                        });

                        return audioSendRecv.connect(localStream).then(() => {
                            console.log('Successfully connected to Sora for audio send channel');
                        }).catch(err => {
                            console.error('Sora connection error for audio send channel:', err);
                        });

                    })
                    .catch(error => {
                        console.error('Error accessing media devices:', error);
                    });
            }

        }

    }, [objectRender]);

    //ビデオ，オブジェクトの追加
    React.useEffect(() => {
        const scene = document.querySelector('a-scene');
        const UIBack = document.querySelector('#UIBack');
        if (scene && rendered) {
            console.log("Add Stereo Assets")
            //assetの追加
            const assets = document.createElement('a-assets');

            const remoteVideo = document.createElement('video');
            remoteVideo.setAttribute('id', 'remotevideo');
            remoteVideo.setAttribute('autoPlay', '');
            remoteVideo.setAttribute('playsInline', '');
            remoteVideo.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideo);

            const leftCanvas  = document.createElement('canvas');


            //const leftCanvas  = document.createElement('canvas');


            const remoteVideoRealSense = document.createElement('video');
            remoteVideoRealSense.setAttribute('id', 'remotevideo-realsense');
            remoteVideoRealSense.setAttribute('autoPlay', '');
            remoteVideoRealSense.setAttribute('playsInline', '');
            remoteVideoRealSense.setAttribute('crossOrigin', 'anonymous');
            assets.appendChild(remoteVideoRealSense);

            scene.appendChild(assets);

            /*leftCanvas.setAttribute('id', 'stereo-left');
            assets.appendChild(leftCanvas);
            const rightCanvas = document.createElement('canvas');
            rightCanvas.setAttribute('id', 'stereo-right');
            assets.appendChild(rightCanvas);*/

            //objectの追加
            const leftSphere = document.createElement('a-entity');
            leftSphere.setAttribute('id', 'leftSphere');
            leftSphere.setAttribute('scale', '-1 1 1');
            leftSphere.setAttribute('position', '0 1.7 0');
            leftSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            leftSphere.setAttribute('material', 'shader:flat; src:#remotevideo; side:back');
            //leftSphere.setAttribute('material', 'shader:flat; src:#stereo-left; side:back');
            leftSphere.setAttribute('stereo', 'eye:left; mode: half;');

            const rightSphere = document.createElement('a-entity');
            rightSphere.setAttribute('id', 'rightSphere');
            rightSphere.setAttribute('scale', '-1 1 1');
            rightSphere.setAttribute('position', '0 1.7 0');
            rightSphere.setAttribute('geometry', 'primitive:sphere; radius:100; segmentsWidth: 60; segmentsHeight:40; thetaLength:180'); //r=100
            rightSphere.setAttribute('material', 'shader:flat; src:#remotevideo; side:back');
            //rightSphere.setAttribute('material', 'shader:flat; src:#stereo-right; side:back');
            rightSphere.setAttribute('stereo', 'eye:right; mode: half;');
            rightSphere.setAttribute('visible', true);
            
            
            if (set_RealSense) {
                const videoPlane = document.createElement('a-plane');
                videoPlane.setAttribute('id', 'videoPlate');
                videoPlane.setAttribute('position', '-0.10 .1 -0.53');
                videoPlane.setAttribute('scale', '0.12 0.12 1');
                videoPlane.setAttribute('width', '1.6');
                videoPlane.setAttribute('height', '1.2');
                videoPlane.setAttribute('material', 'src: #remotevideo-realsense;');
                videoPlane.setAttribute('current-ui', '');
                videoPlane.setAttribute('visible', true); //ワイプの手先カメラ表示
                UIBack.appendChild(videoPlane);
            }

            // 新しい <a-entity> を <a-scene> に追加
            scene.appendChild(leftSphere);
            scene.appendChild(rightSphere);
            console.log("Stereo Video component initialized start objectRender");
            setObjectRender(true)

        }
    }, [rendered])

    React.useEffect(() => {
        const leftSphere = document.querySelector('#leftSphere');
        const rightSphere = document.querySelector('#rightSphere');
        //        const backStereoUI = document.querySelector('#backStereoUI');
        console.log("set stereo visible:", stereo_visible)
        leftSphere.setAttribute('visible', `${stereo_visible}`)
        rightSphere.setAttribute('visible', `${stereo_visible}`)
        //        backStereoUI.setAttribute('visible', `${!stereo_visible}`)

    }, [stereo_visible])

    /*
    React.useEffect(() => {
        const intervalId = setInterval(() => {
            const entity = document.getElementById('UIBack'); // idでエンティティを取得
            if (entity) {
                const position = entity.getAttribute('position'); // 位置を取得
                const rotation = entity.getAttribute('rotation'); // 位置を取得
                setCameraPosition({ x: position.x, y: position.y, z: position.z })
                setCameraRotation({ x: rotation.x, y: rotation.y, z: rotation.z })
            }
        }, 10); // 100msごとに位置を更新

        return () => clearInterval(intervalId); // クリーンアップ
    }, []);
    */

    return (
        <>
        </>
    )
}

if (!('stereo' in AFRAME.components)) {
    console.log('Registering stereo component into A-Frame');
    // Define the stereo component and stereocam component

    const stereoComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
            mode: { type: 'string', default: 'full' },
            split: { type: 'string', default: 'horizontal' },
            playOnClick: { type: 'boolean', default: true },
        },
        init() {
            this.video_click_event_added = false;
            this.material_is_a_video = true;

            if (this.el.getAttribute('material') !== null && 'src' in this.el.getAttribute('material') && this.el.getAttribute('material').src !== '') {
                const src = this.el.getAttribute('material').src;

                if (typeof src === 'object' && ('tagName' in src && src.tagName === 'VIDEO')) {
                    this.material_is_a_video = true;
                }
            }

            const object3D = this.el.object3D.children[0];
            const validGeometries = [THREE.SphereGeometry, THREE.SphereBufferGeometry, THREE.BufferGeometry];
            const isValidGeometry = validGeometries.some(geometry => object3D.geometry instanceof geometry);


            function uEdgeMapParam(u_local, sharp = 0.9) {
                const t = 2.0 * u_local - 1.0;          // 中央0, 左端-1, 右端+1
                const s = Math.sign(t) * Math.pow(Math.abs(t), sharp);
                return 0.5 * (s + 1.0);                 // [0,1] に戻す
            }


            function applyUVmap(geometry, eye /* 'left'|'right' */, opts = {}) {
                const uv = geometry.attributes.uv;

                const uKEdge   = opts.uKEdge   ?? 0.35;   // 上下端での最大ブレンド
                const uKCenter = opts.uKCenter ?? 0.10;   // 中央での最小ブレンド
                const uSharp   = opts.uSharp   ?? 0.9;    // 拡張カーブの鋭さ
                const vToUWeightPower = opts.vToUWeightPower ?? 2;

                const uOffset = (eye === 'left') ? 0.0 : 0.5; 
                const uScale  = 0.5;

                const vCropTop = opts.vCropTop ?? 0.0;
                const vCropBottom = opts.vCropBottom ?? 0.0;
                const vRange = 1.0 - vCropTop - vCropBottom;

                const PADDING_U = 0.07; // 左右10%
                const PADDING_V = 0.06; // 上下10%

                for (let i = 0; i < uv.count; i++) {
                    const u0 = uv.getX(i); 
                    const v0 = uv.getY(i);

                    //const u_lin = u0 * uScale + uOffset;
                    //const v_lin = v0 * vRange + vCropBottom;
                    const u_lin   = u0 * uScale + uOffset;
                    const u_local = (u_lin - uOffset) / uScale;

                    const v_lin   = v0 * vRange + vCropBottom;     // [0,1]
                    const v_local = v_lin;
                    
                    const invURange = 1.0 / Math.max(1e-6, (1.0 - 2.0 * PADDING_U));
                    const invVRange = 1.0 / Math.max(1e-6, (1.0 - 2.0 * PADDING_V));

                    let u_eff = 0.5 + (u_local - 0.5) * invURange;
                    let v_eff = 0.5 + (v_local - 0.5) * invVRange;

                    // 0..1 にクリップ（歪み関数の定義域を守る）
                    u_eff = Math.min(1.0, Math.max(0.0, u_eff));
                    v_eff = Math.min(1.0, Math.max(0.0, v_eff));
                    
                    const v_adj  = v_eff;
                
                    const dVEdge = Math.abs(v_eff - 0.5) / 0.5;                 // 中央0, 上下端1
                    const wEdgeV = Math.pow(dVEdge, vToUWeightPower ?? 2.0);
                    const uK_eff = uKCenter + (uKEdge - uKCenter) * wEdgeV;     // Vに依存する実効強度

                    const u_edge = uEdgeMapParam(u_eff, uSharp);                // U端方向へ寄せる写像
                    const u_mix  = (1.0 - uK_eff) * u_eff + uK_eff * u_edge;    // 補正混合

                    const u_adj  = u_mix * uScale + uOffset;

            
                    uv.setXY(i, u_adj, v_adj);
                }
                uv.needsUpdate = true;
            }


            if (isValidGeometry && this.material_is_a_video) {
                let geometry;
                const geo_def = this.el.getAttribute('geometry');
                if (this.data.mode === 'half') {
                    //geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64, Math.PI / 3, 4 * Math.PI / 3, 0.2, Math.PI-0.4);
                    //RF5.2 geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64, 19 * Math.PI / 36, 17 * Math.PI / 18, 0, Math.PI);
                    geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64, 10 * Math.PI / 18, 16 * Math.PI / 18, 1 * Math.PI / 18, Math.PI - 2 * Math.PI / 18);
                } else {
                    geometry = new THREE.SphereGeometry(geo_def.radius || 100, geo_def.segmentsWidth || 64, geo_def.segmentsHeight || 64);
                }
                
                //object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1); //20?
                //const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                //const offset = this.data.eye === 'left' ? (axis === 'y' ? { x: 0.05, y: 0 } : { x: 0, y: 0.5 }) : (axis === 'y' ? { x: 0.55, y: 0 } : { x: 0, y: 0 });
                //const repeat = axis === 'y' ? { x: 0.4, y: 1 } : { x: 1, y: 0.5 };
                //RF5.2object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1);
                //RF5.2object3D.position.y = 1.7;
                //RF5.2 const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                //RF5.2 const offset = this.data.eye === 'right' ? (axis === 'y' ? { x: 0, y: 0 } : { x: 0, y: 0.5 }) : (axis === 'y' ? { x: 0.5, y: 0 } : { x: 0, y: 0 });
                //RF5.2 const repeat = axis === 'y' ? { x: 0.5, y: 1 } : { x: 1, y: 0.5 };
                object3D.position.x = 0.032 * (this.data.eye === 'left' ? -1 : 1);
                object3D.position.y = 1.7;

                /*const axis = this.data.split === 'horizontal' ? 'y' : 'x';
                const offset = this.data.eye === 'left' ? (axis === 'y' ? { x: 0, y: 0.1 } : { x: 0, y: 0.5 }) : (axis === 'y' ? { x: 0.5, y: 0.1 } : { x: 0, y: 0 });
                const repeat = axis === 'y' ? { x: 0.5, y: 0.9 } : { x: 1, y: 0.5 };
                const uvAttribute = geometry.attributes.uv;
                for (let i = 0; i < uvAttribute.count; i++) {
                    const u = uvAttribute.getX(i) * repeat.x + offset.x;
                    const v = uvAttribute.getY(i) * repeat.y + offset.y;
                    uvAttribute.setXY(i, u, v);
                }
                uvAttribute.needsUpdate = true;*/

                applyUVmap(geometry, this.data.eye, {

                    uKEdge: 1, uKCenter: 0.1, uSharp: 0.95, vToUWeightPower: 4

                });

                object3D.rotation.y = Math.PI / 2;

                object3D.geometry = geometry;
                this.videoEl = document.getElementById('remotevideo');
                this.el.setAttribute('material', { src: this.videoEl });
                                this.videoEl.play();
            } else {
                this.video_click_event_added = true;
            }
        },
        update(oldData) {
            const object3D = this.el.object3D.children[0];
            const data = this.data;
            if (data.eye === 'both') {
                object3D.layers.set(0);
            } else {
                object3D.layers.set(data.eye === 'left' ? 1 : 2);
            }
        },
    };


    const stereocamComponent = {
        schema: {
            eye: { type: 'string', default: 'left' },
        },
        init() {
            this.layer_changed = false;
        },
        tick() {
            const originalData = this.data;
            if (!this.layer_changed) {
                const childrenTypes = this.el.object3D.children.map(item => item.type);
                const rootIndex = childrenTypes.indexOf('PerspectiveCamera');
                const rootCam = this.el.object3D.children[rootIndex];
                if (originalData.eye === 'both') {
                    rootCam.layers.enable(1);
                    rootCam.layers.enable(2);
                } else {
                    rootCam.layers.enable(originalData.eye === 'left' ? 1 : 2);
                }
            }
        },
    };

    if (!('stereo' in AFRAME.components)) {
        AFRAME.registerComponent('stereo', stereoComponent);
    }
    if (!('stereocam' in AFRAME.components)) {
        AFRAME.registerComponent('stereocam', stereocamComponent);
    }
}

