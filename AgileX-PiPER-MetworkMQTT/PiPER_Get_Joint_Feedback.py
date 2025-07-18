import time
from piper_sdk import *

import numpy as np

def get_joint_feedback(msg, factor):
    joint_1 = msg.joint_state.joint_1 / factor
    joint_2 = msg.joint_state.joint_2 / factor
    joint_3 = msg.joint_state.joint_3 / factor
    joint_4 = msg.joint_state.joint_4 / factor
    joint_5 = msg.joint_state.joint_5 / factor
    joint_6 = msg.joint_state.joint_6 / factor

    theta_Body_feedback = [joint_1, joint_2, joint_3, joint_4, joint_5, joint_6]
    return theta_Body_feedback

def get_joint_feedback_mr(msg, factor):
    joint_1 = msg.joint_state.joint_1 / factor
    joint_2 = msg.joint_state.joint_2 / factor
    joint_3 = msg.joint_state.joint_3 / factor
    joint_4 = msg.joint_state.joint_4 / factor
    joint_5 = msg.joint_state.joint_5 / factor
    joint_6 = msg.joint_state.joint_6 / factor

    theta_Body_feedback = [joint_1, joint_2 - np.radians(90), joint_3 + np.radians(169.997), joint_4, joint_5 + 0.03, joint_6]
    return theta_Body_feedback

# 测试代码
if __name__ == "__main__":
    piper = C_PiperInterface_V2(dh_is_offset=1)
    piper.ConnectPort()
    time.sleep(0.01)
    msg = piper.GetArmJointMsgs()

    factor = 57295.7795
    joint_1 = msg.joint_state.joint_1 / factor
    joint_2 = msg.joint_state.joint_2 / factor
    joint_3 = msg.joint_state.joint_3 / factor
    joint_4 = msg.joint_state.joint_4 / factor
    joint_5 = msg.joint_state.joint_5 / factor
    joint_6 = msg.joint_state.joint_6 / factor

    theta_Body_feedback = [joint_1, joint_2 + np.radians(90), joint_3 - np.radians(169.997), joint_4, joint_5 - 0.03, joint_6]
    print("theta_Body_feedback:", theta_Body_feedback)




