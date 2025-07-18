# MetaworkMQTT Protocol-Based PiPER Controller

<div align="center">
  <img src="./MQTT_Control_Framework.svg" alt="System Architecture" width="1000"/>
  <p><em>Figure 1: System Architecture of PiPER Control via MetaworkMQTT</em></p>
</div>

## 🚀 Quick Start

### 🧩 Step 1: Run MQTT Controller (User Site)
```bash
cd ./src/app
npm run dev-https
```

💡 If this is your first time running the project, you need to install the required Node.js modules first:
```bash
cd ./src/app
npm install
```

🌐 After the server is running, you can access the VR Viewer in your browser by appending /viewer to the server address. 

   Open the Viewer in your browser:
   ```arduion
   https://<your-server-address>/viewer
   ```

  For example:
  ```arduion
  https://192.168.197.37:3000/viewer/
  ```
  This interface is used to visualize and send VR controller data via MQTT.

📊 You can also access the status monitor via the following URL:
```arduion
https://sora2.uclab.jp/menroll
```
This page provides a real-time interface for observing user information.

🛠 Customize Your Project Name

To differentiate your project from others, it is **recommended to change the project name** in the `package.json` file.

Edit line 2 of `package.json`:

```json
"name": "PiPER-control-<YourName>",
```

###  🧩 Step 2: Run PiPER Controller (Robot Site)
Follow the steps below to control the **AgileX-PiPER** robot via MQTT:

1. **Activate the CAN bus**
   Execute the following command in your terminal:
   ```bash
   cd ./AgileX-PiPER-MetworkMQTT
   bash can_activate.sh can0 1000000
   ```

2. **Start the PiPER SDK UI**
   
   (check "agilex_pipier_connect.mkv" in the video folder )
   
   🌐 Download the PiPER SDK UI
   
   ```arduion
   https://github.com/agilexrobotics/Piper_sdk_ui.git
   ```

   Open PiPER SDK UI
   ```bash
   cd Piper_sdk_ui
   python piper_ui.py 
   ```

   To reset the robot, open the PiPER SDK Tools and perform the following operations:

      (0) Click **Find CAN Port**
      
      (1) Click **Reset**
      
      (2) Click **Enable**
      
      (3) Click **Go Zero**
      
   🔁 If the robot fails to go to the zero position, repeat steps (1)~(3) a few times until successful.

   To reset the tool, Click **Gripper Zero**

4. **Set the robot to the working position**
   
   Run the following script:
   ```bash
   python piper_work_position_initialize.py
   ```

   ⚠️ If this is your first time using the robot, **calibration** may be required before running the script.

5. **Retrieve your USER_UUID from the Viewer**
   
   (check "mqtt_teleoperation_start.mp4" in the video folder )
   
   Open the Viewer in your browser:
   
   ```arduion
   https://<your-server-address>/viewer
   ```

   For example:
   ```arduion
   https://192.168.197.37:3000/viewer/
   ```
   
   Press F12 to open Developer Tools
   
   Look for the **USER_UUID** in the console or network tab and copy it to the "MQTT_Recv.py", Line 25. For example:

   ```python
   USER_UUID = "84f289d0-bf07-4ad2-baf1-a4c8f7c9a763-qk4b9zg-viewer"
   ```

   ⚠️ **Important**: **USER_UUID changes every time** the MQTT Controller (User Site) is restarted. You must repeat this step each time you launch the MQTT Controller to ensure proper functionality.
   
7. **Run the Robot Controller Script**

   Choose one of the following options depending on your control needs:

   - **PD Control + Trajectory Planning**  
     This is the most stable option, as both velocity and acceleration are smoothly planned.
     ```bash
     python MQTT_Robot_Feedback_PD_Traj.py
     ```

   - **PD Control**  
     Basic proportional-derivative control without trajectory planning.
     ```bash
     python MQTT_Robot_Feedback_PD.py
     ```

   - **Direct Control Signal**  
     Sends raw control signals directly to the robot without any feedback or planning.
     ```bash
     python MQTT_Robot_Control.py
     ```

### 🧪 Run in Simulator
You can also simulate PiPER Metawork MQTT robot control using [CoppeliaSim](https://www.coppeliarobotics.com/).

1. **Download CoppeliaSim**

   Visit the official website to download the latest version:

   ```arduion
   https://www.coppeliarobotics.com/
   ```

3. **Launch CoppeliaSim**

   Navigate to your CoppeliaSim installation directory and run:
  
    ```bash
    ./coppeliaSim
    ```

4. **Load the simulation scene**

   Open the scene file: "piper_robot_sample.ttt" in the floder "AgileX-PiPER-MetworkMQTT"

5. **Start the simulation**

   Click the "Play" button in CoppeliaSim to start the simulation.

6. **Run the simulator control script**
   ```bash
   python MQTT_Robot_Simulator.py
   ```

## 🕶️ Open MQTT Controller in VR

To operate the robot in VR, open the controller interface in the browser inside your VR headset:

  ```arduion
  https://<your-server-address>
  ```

  For example:
  ```arduion
  https://192.168.197.37:3000
  ```

  Once the page is open, press the "AR" button to enter augmented reality mode.
   
### 🎮 Controller Operations

The following input mappings are used to operate the PiPER robot via the VR controller:

| Input Combination         | Action       |
|---------------------------|--------------|
| Trigger                   | Move the robot (6-DoF pose) |
| Grip + Button A           | Release  |
| Grip + Button B           | Grasp   |

> Make sure the controller is tracked and visible to the VR camera to ensure accurate input.


### ⚠️ Notifications

1. **Keep the VR controller within camera view**  
   The pose of the VR controller is estimated using both the onboard **accelerometer** and the **tracking camera** located on the side of the VR headset.  
   > ⚠️ If the controller goes out of view, pose estimation may become inaccurate, resulting in input drift.

2. **Wait for system initialization**  
   After putting on the VR headset or restarting the system, **always wait until initialization is complete**.  
   Skipping this step may result in control drift or unstable input.
   
   > ⚠️ If the controller appears frozen or unresponsive, it may indicate a tracking issue.
   
   > ✅ If you can see the controller moving in sync with your hand, it is functioning correctly.  

## 📚 Citations

The inverse kinematics (IK) implementation in this project is based on the **Modern Robotics** library by Kevin Lynch et al.

- 📘 Book: *Modern Robotics: Mechanics, Planning, and Control*  
- 💻 Source Code: [NxRLab/ModernRobotics GitHub Repository](https://github.com/NxRLab/ModernRobotics)

## 📹 Demo Videos

- [▶️ Demo 1: Cloth Folding 1](https://youtu.be/y29keqx_X6Q)
- [▶️ Demo 2: Cloth Folding 2](https://youtu.be/i-OcnSqnyN8)

## 🐍 Python Packages

It is recommended to use a `conda` environment to manage dependencies, for example:

```bash
conda create -n Modern_Robotics_Control_IK python=3.12
conda activate Modern_Robotics_Control_IK
```

If you forgot your conda environment name:
```bash
conda info --envs
```
to check your conda environemnt list.

### Dependencies
📐 Math & Utilities
```bash
pip install numpy
```

📡 Communication
```bash
pip install paho-mqtt
pip install python-dotenv
pip install ipget
```

🤖 Robotics
```bash
pip install piper-sdk
pip install modern-robotics
```

🖥️ Robot Monitor UI
```bash
pip install PyQt5
pip install pyqtgraph
```

🧪 Simulator (CoppeliaSim Remote API)
```bash
pip install coppeliasim-zmqremoteapi-client
```


