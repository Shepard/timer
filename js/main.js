"use strict";

const DEFAULT_TIMEOUT = 1 * 60 * 1000;

// Number of milliseconds between each update of the timer.
const RESOLUTION = 50;

let currentTimer = null;

function RunningTimer(timeout, updateCallback, finishedCallback, pausedCallback, continueCallback, stoppedCallback) {
	this.timeout = timeout;
	this.updateCallback = updateCallback;
	this.finishedCallback = finishedCallback;
	this.pausedCallback = pausedCallback;
	this.continueCallback = continueCallback;
	this.stoppedCallback = stoppedCallback;
	this.state = "NOT_RUNNING";
	this.startTime = null;
	this.currentTime = null;
	this.targetTime = null;
	this.timeoutLeft = null;
	this.timeoutHandle = null;
}

RunningTimer.prototype.start = function() {
	this.startTime = Date.now();
	this.currentTime = this.startTime;
	this.targetTime = this.startTime + this.timeout;
	this.timeoutLeft = this.timeout;
	this.state = "RUNNING";

	this.timeoutHandle = setInterval(() => {
		this._tick();
	}, RESOLUTION);
};

RunningTimer.prototype._tick = function() {
	this.currentTime = Date.now();
	this.timeoutLeft = this.targetTime - this.currentTime;

	if (this.timeoutLeft <= 0) {
		this.timeoutLeft = 0;
		this.updateCallback(this);
		this._finish();
	} else {
		this.updateCallback(this);
	}
};

RunningTimer.prototype._finish = function() {
	if (this.timeoutHandle) {
		clearTimeout(this.timeoutHandle);
		this.timeoutHandle = null;
	}
	this.state = "FINISHED";
	this.finishedCallback(this);
};

RunningTimer.prototype.pause = function() {
	if (this.state == "RUNNING") {
		if (this.timeoutHandle) {
			clearTimeout(this.timeoutHandle);
			this.timeoutHandle = null;
		}
		this.state = "PAUSED";
		this.pausedCallback(this);
	}
};

RunningTimer.prototype.continue = function() {
	if (this.state == "PAUSED") {
		this.startTime = Date.now();
		this.currentTime = this.startTime;
		this.targetTime = this.startTime + this.timeoutLeft;
		this.state = "RUNNING";

		this.timeoutHandle = setInterval(() => {
			this._tick();
		}, RESOLUTION);

		this.continueCallback(this);
	}
};

RunningTimer.prototype.stop = function() {
	this.state = "STOPPED";
	if (this.timeoutHandle) {
		clearInterval(this.timeoutHandle);
		this.timeoutHandle = null;
	}
	this.stoppedCallback(this);
};

function startTimer(timeout, updateCallback, finishedCallback, pausedCallback, continueCallback, stoppedCallback) {
	if (currentTimer != null && currentTimer.state == "RUNNING") {
		currentTimer.stop();
	}
	currentTimer = new RunningTimer(timeout, updateCallback, finishedCallback, pausedCallback, continueCallback, stoppedCallback);
	currentTimer.start();
}

function toTimeDescriptor(milliseconds) {
	let seconds = milliseconds / 1000;
	let minutes = seconds / 60;
	let hours = Math.floor(minutes / 60);
	minutes = Math.floor(minutes - hours * 60);
	let secondFraction = Math.floor((seconds - Math.floor(seconds)) * 10);
	seconds = Math.floor(seconds - minutes * 60 - hours * 60 * 60);
	return [hours, minutes, seconds, secondFraction];
}

function toTimeString(milliseconds) {
	const timeDescriptor = toTimeDescriptor(milliseconds);
	const secondsString = pad(timeDescriptor[2], 2);
	const minutesString = pad(timeDescriptor[1], 2);
	const hoursString = pad(timeDescriptor[0], 2);
	return hoursString + ":" + minutesString + ":" + secondsString + "." + timeDescriptor[3];
}

function pad(number, numberOfDigits) {
	number = number + "";
	return number.length >= numberOfDigits ? number : new Array(numberOfDigits - number.length + 1).join("0") + number;
}

function getDigit(number, index) {
	number = pad(number, 2);
	return number.charAt(index);
}

document.addEventListener("DOMContentLoaded", () => {
	const btnReset = document.getElementById("btn--reset");
	const btnStartPause = document.getElementById("btn--start-pause");
	const outStateDebug = document.getElementById("out--state-debug");
	const outHours1 = document.getElementById("out--hours-1");
	const outMinutes1 = document.getElementById("out--minutes-1");
	const outMinutes2 = document.getElementById("out--minutes-2");
	const outSeconds1 = document.getElementById("out--seconds-1");
	const outSeconds2 = document.getElementById("out--seconds-2");
	const outSecondFraction1 = document.getElementById("out--second-fraction-1");

	function updateTimeDisplay(milliseconds, animate) {
		const timeDescriptor = toTimeDescriptor(milliseconds);
		updateDigit(outHours1, timeDescriptor[0] + "");
		updateDigit(outMinutes1, getDigit(timeDescriptor[1], 0), animate);
		updateDigit(outMinutes2, getDigit(timeDescriptor[1], 1), animate);
		updateDigit(outSeconds1, getDigit(timeDescriptor[2], 0), animate);
		updateDigit(outSeconds2, getDigit(timeDescriptor[2], 1), animate);
		updateDigit(outSecondFraction1, timeDescriptor[3] + "");
	}

	function updateDigit(element, digit, animate) {
		if (digit != element.textContent) {
			if (animate) {
				element.dataset.previousDigit = element.textContent;
				element.classList.remove("animate");
				// Trigger reflow by requesting a property to make removing the class take effect.
				element.offsetHeight;
				element.classList.add("animate");
			}
			element.textContent = digit;
		}
	}

	updateTimeDisplay(DEFAULT_TIMEOUT);

	function update(timer) {
		updateTimeDisplay(timer.timeoutLeft, true);
		outStateDebug.textContent = timer.state;
	}

	function finished(timer) {
		btnStartPause.textContent = btnStartPause.dataset.startLabel;
		// TODO beep
		alert("BEEP BEEP!");
		outStateDebug.textContent = timer.state;
		// currentTimer = null;
	}

	function paused(timer) {
		btnStartPause.textContent = btnStartPause.dataset.startLabel;
		outStateDebug.textContent = timer.state;
	}

	function continueCallback(timer) {
		btnStartPause.textContent = btnStartPause.dataset.pauseLabel;
		outStateDebug.textContent = timer.state;
	}

	function stopped(timer) {
		btnStartPause.textContent = btnStartPause.dataset.startLabel;
		outStateDebug.textContent = timer.state;
	}

	btnStartPause.addEventListener("click", () => {
		if (currentTimer && currentTimer.state == "RUNNING") {
			currentTimer.pause();
		} else if (currentTimer && currentTimer.state == "PAUSED") {
			currentTimer.continue();
		} else {
			btnStartPause.textContent = btnStartPause.dataset.pauseLabel;
			startTimer(DEFAULT_TIMEOUT, update, finished, paused, continueCallback, stopped);
		}
	}, false);

	btnReset.addEventListener("click", () => {
		if (currentTimer) {
			if (currentTimer.state == "RUNNING") {
				currentTimer.stop();
			}
			currentTimer = null;
		}

		updateTimeDisplay(DEFAULT_TIMEOUT, true);
	}, false);
});