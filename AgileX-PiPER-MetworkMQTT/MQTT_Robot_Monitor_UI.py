# monitor_gui.py
import sys
import time
import numpy as np
import multiprocessing.shared_memory as sm
from PyQt5 import QtWidgets, QtCore
import pyqtgraph as pg

class JointMonitor(QtWidgets.QMainWindow):
    def __init__(self, shm_name="PiPER"):
        super().__init__()
        self.setWindowTitle("PiPER Joint Monitor")
        self.resize(1000, 600)

        # Connect to shared memory
        try:
            self.shm = sm.SharedMemory(name=shm_name)
            self.arr = np.ndarray((16,), dtype=np.float32, buffer=self.shm.buf)
            print("Connected to shared memory:", shm_name)
        except FileNotFoundError:
            QtWidgets.QMessageBox.critical(self, "Error", f"Shared memory '{shm_name}' not found.\nPlease run the main program first.")
            sys.exit(1)

        # Create central widget
        self.central_widget = QtWidgets.QWidget()
        self.setCentralWidget(self.central_widget)

        # Layout
        layout = QtWidgets.QVBoxLayout()
        self.central_widget.setLayout(layout)

        # PyQtGraph plot
        self.plot_widget = pg.GraphicsLayoutWidget()
        layout.addWidget(self.plot_widget)

        self.plots = []
        self.curves_current = []
        self.curves_target = []
        self.data_current = [[] for _ in range(6)]
        self.data_target = [[] for _ in range(6)]
        self.time_data = []

        for i in range(6):
            p = self.plot_widget.addPlot(title=f"Joint {i+1}")
            p.setYRange(-2.0, 2.0)
            curve_current = p.plot(pen=pg.mkPen(color=(255, 0, 0), width=2), name="Feedback")
            curve_target = p.plot(pen=pg.mkPen(color=(0, 0, 225), width=2), name="Target")
            self.plots.append(p)
            self.curves_current.append(curve_current)
            self.curves_target.append(curve_target)
            self.plot_widget.nextRow()

        self.step = 0
        self.max_points = 300  # sliding window length

        # Timer
        self.timer = QtCore.QTimer()
        self.timer.timeout.connect(self.update_plot)
        self.timer.start(20)

    def update_plot(self):
        self.time_data.append(self.step)
        self.step += 1

        current = self.arr[0:6].copy()
        target = self.arr[8:14].copy()

        for i in range(6):
            self.data_current[i].append(current[i])
            self.data_target[i].append(target[i])
            # maintain sliding window
            if len(self.data_current[i]) > self.max_points:
                self.data_current[i].pop(0)
                self.data_target[i].pop(0)

            self.curves_current[i].setData(self.data_current[i])
            self.curves_target[i].setData(self.data_target[i])

if __name__ == "__main__":
    app = QtWidgets.QApplication(sys.argv)
    win = JointMonitor()
    win.show()
    sys.exit(app.exec_())
