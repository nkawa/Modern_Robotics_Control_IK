from MQTT_Recv import MQTT_Recv
import sys
import time
import multiprocessing.shared_memory as sm
import numpy as np

from coppeliasim_zmqremoteapi_client import RemoteAPIClient

# Connect to CoppeliaSim
def simulator_initialize():
    copp_client = RemoteAPIClient()
    sim = copp_client.getObject('sim')

    joint_names = ['/piper/joint1', '/piper/joint2', '/piper/joint3', '/piper/joint4', '/piper/joint5', '/piper/joint6']
    joint_handles = [sim.getObject(joint_name) for joint_name in joint_names]

    tool_names = ['/piper/joint7', '/piper/joint8']
    tool_handles = [sim.getObject(tool_name) for tool_name in tool_names]

    return sim, joint_handles, tool_handles

# def pose_initialize(sim, joint_handles):
#     theta_initial = np.radians([0, -30, 70, 0, 65, 0])
#     for i, handle in enumerate(joint_handles):
#         sim.setJointTargetPosition(handle, theta_initial[i])

def send_joint_angles(sim, joint_handles, angles):
    for i, handle in enumerate(joint_handles):
        sim.setJointTargetPosition(handle, angles[i])

def send_tool_angles(sim, tool_handles, angles):
    finger_pos_1 = (((angles) * 0.4) / 1000) + 0.0004
    finger_pos_2 = (((angles) * 0.4) / 1000) + 0.0004
    finger_poses = [finger_pos_1, finger_pos_2]
    for i, handle in enumerate(tool_handles):
        sim.setJointTargetPosition(handle, finger_poses[i])

# Create Shared Memory
try:
    shm = sm.SharedMemory("PiPER", create=True, size=16*4)
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    arr[:] = 0
    print("Shared memory PiPER created.")
except FileExistsError:
    shm = sm.SharedMemory("PiPER")
    arr = np.ndarray((16,), dtype=np.float32, buffer=shm.buf)
    print("Shared memory PiPER already exists.")

# Main
if __name__ == '__main__':
    recv = MQTT_Recv()
    sim, joint_handles, tool_handles = simulator_initialize()
    thetaBody_initial = np.array([0,-0.27473,1.44144,0,1.22586,0])
    arr[8:14] = thetaBody_initial # Initial joint angles
    arr[15] = 0.0  # Initial tool angle
    # print("Shared memory PiPER created and initialized.")
    try:
        recv.run_proc()
        shm = recv.get_shm_object()
        print("shared memory name：", shm.name)
        time.sleep(0.1)
        while True:
            arr = recv.get_shared_memory()

            thetaBody = arr[8:14].astype(float)  # 6Dof robot
            print("thetaBody memory：", thetaBody)
            send_joint_angles(sim, joint_handles, thetaBody)

            thetaTool = arr[15].astype(float)
            print("thetaTool memory：", thetaTool)
            send_tool_angles(sim, tool_handles, thetaTool)

            time.sleep(0.0165)
    except KeyboardInterrupt:
        print("MQTT Recv Stopped")
        sys.exit(0)
    except Exception as e:
        print("MQTT Recv Error:", e)
        sys.exit(1)