/*
modified from pxt-servo/servodriver.ts
load dependency
"motorbit": "file:../pxt-motorbit"
*/
enum Offset {
    //% block=one
    ONE = 0,
    //% block=two
    TWO = 1,
    //% block=three
    THREE = 2,
    //% block=four
    FOUR = 3
}

//% color="#EE6A50" weight=10 icon="\uf0d1"
namespace motorbit {
const PCA9685_ADDRESS = 0x40
const MODE1 = 0x00
const MODE2 = 0x01
const SUBADR1 = 0x02
const SUBADR2 = 0x03
const SUBADR3 = 0x04
const PRESCALE = 0xFE
const LED0_ON_L = 0x06
const LED0_ON_H = 0x07
const LED0_OFF_L = 0x08
const LED0_OFF_H = 0x09
const ALL_LED_ON_L = 0xFA
const ALL_LED_ON_H = 0xFB
const ALL_LED_OFF_L = 0xFC
const ALL_LED_OFF_H = 0xFD

const STP_CHA_L = 2047
const STP_CHA_H = 4095

const STP_CHB_L = 1
const STP_CHB_H = 2047

const STP_CHC_L = 1023
const STP_CHC_H = 3071

const STP_CHD_L = 3071
const STP_CHD_H = 1023

export enum Servos {
    S1 = 0x01,
    S2 = 0x02,
    S3 = 0x03,
    S4 = 0x04,
    S5 = 0x05,
    S6 = 0x06,
    S7 = 0x07,
    S8 = 0x08
}

export enum Motors {
    M1 = 0x1,
    M2 = 0x2,
    M3 = 0x3,
    M4 = 0x4
}

export enum Steppers {
    STPM1_2 = 0x2,
    STPM3_4 = 0x1
}

export enum SonarVersion {
    V1 = 0x1,
    V2 = 0x2
}

export enum Turns {
    //% blockId="T1B4" block="1/4"
    T1B4 = 90,
    //% blockId="T1B2" block="1/2"
    T1B2 = 180,
    //% blockId="T1B0" block="1"
    T1B0 = 360,
    //% blockId="T2B0" block="2"
    T2B0 = 720,
    //% blockId="T3B0" block="3"
    T3B0 = 1080,
    //% blockId="T4B0" block="4"
    T4B0 = 1440,
    //% blockId="T5B0" block="5"
    T5B0 = 1800
}

let initialized = false
let matBuf = pins.createBuffer(17);
let distanceBuf = 0;

function i2cwrite(addr: number, reg: number, value: number) {
    let buf = pins.createBuffer(2)
    buf[0] = reg
    buf[1] = value
    pins.i2cWriteBuffer(addr, buf)
}

function i2ccmd(addr: number, value: number) {
    let buf = pins.createBuffer(1)
    buf[0] = value
    pins.i2cWriteBuffer(addr, buf)
}

function i2cread(addr: number, reg: number) {
    pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
    let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    return val;
}

function initPCA9685(): void {
    i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
    setFreq(50);
    for (let idx = 0; idx < 16; idx++) {
        setPwm(idx, 0, 0);
    }
    initialized = true
}

function setFreq(freq: number): void {
    // Constrain the frequency
    let prescaleval = 25000000;
    prescaleval /= 4096;
    prescaleval /= freq;
    prescaleval -= 1;
    let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
    let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
    let newmode = (oldmode & 0x7F) | 0x10; // sleep
    i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
    i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
    control.waitMicros(5000);
    i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
}

function setPwm(channel: number, on: number, off: number): void {
    if (channel < 0 || channel > 15)
        return;
    //serial.writeValue("ch", channel)
    //serial.writeValue("on", on)
    //serial.writeValue("off", off)

    let buf = pins.createBuffer(5);
    buf[0] = LED0_ON_L + 4 * channel;
    buf[1] = on & 0xff;
    buf[2] = (on >> 8) & 0xff;
    buf[3] = off & 0xff;
    buf[4] = (off >> 8) & 0xff;
    pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
}


function setStepper(index: number, dir: boolean): void {
    if (index == 1) {
        if (dir) {
            setPwm(0, STP_CHA_L, STP_CHA_H);
            setPwm(2, STP_CHB_L, STP_CHB_H);
            setPwm(1, STP_CHC_L, STP_CHC_H);
            setPwm(3, STP_CHD_L, STP_CHD_H);
        } else {
            setPwm(3, STP_CHA_L, STP_CHA_H);
            setPwm(1, STP_CHB_L, STP_CHB_H);
            setPwm(2, STP_CHC_L, STP_CHC_H);
            setPwm(0, STP_CHD_L, STP_CHD_H);
        }
    } else {
        if (dir) {
            setPwm(4, STP_CHA_L, STP_CHA_H);
            setPwm(6, STP_CHB_L, STP_CHB_H);
            setPwm(5, STP_CHC_L, STP_CHC_H);
            setPwm(7, STP_CHD_L, STP_CHD_H);
        } else {
            setPwm(7, STP_CHA_L, STP_CHA_H);
            setPwm(5, STP_CHB_L, STP_CHB_H);
            setPwm(6, STP_CHC_L, STP_CHC_H);
            setPwm(4, STP_CHD_L, STP_CHD_H);
        }
    }
}

function stopMotor(index: number) {
    setPwm((index - 1) * 2, 0, 0);
    setPwm((index - 1) * 2 + 1, 0, 0);
}

/**
 * Servo Execute
 * @param index Servo Channel; eg: S1
 * @param degree [0-180] degree of servo; eg: 0, 90, 180
*/
//% blockId=motorbit_servo block="Servo|%index|degree|%degree"
//% group="Servo" weight=100
//% degree.defl=90
//% degree.min=0 degree.max=180
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function Servo(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}

/**
 * Servo Execute
 * @param index Servo Channel; eg: S1
 * @param degree1 [0-180] degree of servo; eg: 0, 90, 180
 * @param degree2 [0-180] degree of servo; eg: 0, 90, 180
 * @param speed [1-10] speed of servo; eg: 1, 10
*/
//% blockId=motorbit_servospeed block="Servo|%index|degree start %degree1|end %degree2|speed %speed"
//% group="Servo" weight=96
//% degree1.min=0 degree1.max=180
//% degree2.min=0 degree2.max=180
//% speed.min=1 speed.max=10
//% inlineInputMode=inline
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function Servospeed(index: Servos, degree1: number, degree2: number, speed: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    if(degree1 > degree2){
        for(let i=degree1;i>degree2;i--){
            let v_us = (i * 1800 / 180 + 600) // 0.6 ~ 2.4
            let value = v_us * 4096 / 20000
            basic.pause(4 * (10 - speed));
            setPwm(index + 7, 0, value)
        }
    }
    else{
        for(let i=degree1;i<degree2;i++){
            let v_us = (i * 1800 / 180 + 600) // 0.6 ~ 2.4
            let value = v_us * 4096 / 20000
            basic.pause(4 * (10 - speed));
            setPwm(index + 7, 0, value)
        }
    }
}

/**
 * Geek Servo
 * @param index Servo Channel; eg: S1
 * @param degree [-45-225] degree of servo; eg: -45, 90, 225
*/
//% blockId=motorbit_gservo block="Geek Servo|%index|degree %degree=protractorPicker"
//% group="GeekServo" weight=96
//% blockGap=50
//% degree.defl=90
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function EM_GeekServo(index: Servos, degree: number): void {
    if (!initialized) {
        initPCA9685()
    }
    // 50hz: 20,000 us
    let v_us = ((degree - 90) * 20 / 3 + 1500) // 0.6 ~ 2.4
    let value = v_us * 4096 / 20000
    setPwm(index + 7, 0, value)
}


 /**
     * GeekServo2KG
     * @param index Servo Channel; eg: S1
     * @param degree [0-360] degree of servo; eg: 0, 180, 360
    */
    //% blockId=motorbit_gservo2kg block="GeekServo2KG|%index|degree %degree"
    //% group="GeekServo" weight=95
    //% blockGap=50
    //% degree.min=0 degree.max=360
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo2KG(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        //let v_us = (degree * 2000 / 360 + 500)  0.5 ~ 2.5
        let v_us = (Math.floor((degree) * 2000 / 350) + 500) //fixed
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }
	
	/**
     * GeekServo5KG
     * @param index Servo Channel; eg: S1
     * @param degree [0-360] degree of servo; eg: 0, 180, 360
    */
    //% blockId=motorbit_gservo5kg block="GeekServo5KG|%index|degree %degree"
    //% group="GeekServo" weight=94
    //% degree.min=0 degree.max=360
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo5KG(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        const minInput = 0;
        const maxInput = 355;//理论值为360
        const minOutput = 500;
        const maxOutput = 2500;
        const v_us = ((degree - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;

        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    //% blockId=motorbit_gservo5kg_motor block="GeekServo5KG_MotorEN|%index|speed %speed"
    //% group="GeekServo" weight=93
    //% speed.min=-255 speed.max=255
    //% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
    export function EM_GeekServo5KG_Motor(index: Servos, speed: number): void { //5KG的电机模式 3000-5000 4000是回中
        if (!initialized) {
            initPCA9685()
        }
        const minInput = -255;
        const maxInput = 255;
        const minOutput = 5000;
        const maxOutput = 3000;

        const v_us = ((speed - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }	
	


//% blockId=motorbit_stop_all block="Motor Stop All"
//% group="Motor" weight=81
//% blockGap=50
export function MotorStopAll(): void {
    if (!initialized) {
        initPCA9685()
    }
    for (let idx = 1; idx <= 4; idx++) {
        stopMotor(idx);
    }
}

//% blockId=motorbit_stop block="Motor Stop|%index|"
//% group="Motor" weight=82
export function MotorStop(index: Motors): void {
    MotorRun(index, 0);
}

//% blockId=motorbit_motor_run block="Motor|%index|speed %speed"
//% group="Motor" weight=86
//% speed.min=-255 speed.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRun(index: Motors, speed: number): void {
    if (!initialized) {
        initPCA9685()
    }
    speed = speed * 16; // map 255 to 4096
    if (speed >= 4096) {
        speed = 4095
    }
    if (speed <= -4096) {
        speed = -4095
    }
    if (index > 4 || index <= 0)
        return
    let pp = (index - 1) * 2
    let pn = (index - 1) * 2 + 1
    if (speed >= 0) {
        setPwm(pp, 0, speed)
        setPwm(pn, 0, 0)
    } else {
        setPwm(pp, 0, 0)
        setPwm(pn, 0, -speed)
    }
}

/**
 * Execute single motors with delay
 * @param index Motor Index; eg: A01A02, B01B02, A03A04, B03B04
 * @param speed [-255-255] speed of motor; eg: 150, -150
 * @param delay seconde delay to stop; eg: 1
*/
//% blockId=motorbit_motor_rundelay block="Motor|%index|speed %speed|delay %delay|s"
//% group="Motor" weight=85
//% speed.min=-255 speed.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
    MotorRun(index, speed);
    basic.pause(delay * 1000);
    MotorRun(index, 0);
}

/**
 * Execute two motors at the same time
 * @param motor1 First Motor; eg: A01A02, B01B02
 * @param speed1 [-255-255] speed of motor; eg: 150, -150
 * @param motor2 Second Motor; eg: A03A04, B03B04
 * @param speed2 [-255-255] speed of motor; eg: 150, -150
*/
//% blockId=motorbit_motor_dual block="Motor|%motor1|speed %speed1|%motor2|speed %speed2"
//% group="Motor" weight=84
//% inlineInputMode=inline
//% speed1.min=-255 speed1.max=255
//% speed2.min=-255 speed2.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=4
export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
    MotorRun(motor1, speed1);
    MotorRun(motor2, speed2);
}

/**
 * Execute two motors at the same time
 * @param motor1 First Motor; eg: A01A02, B01B02
 * @param speed1 [-255-255] speed of motor; eg: 150, -150
 * @param motor2 Second Motor; eg: A03A04, B03B04
 * @param speed2 [-255-255] speed of motor; eg: 150, -150
*/
//% blockId=motorbit_motor_dualDelay block="Motor|%motor1|speed %speed1|%motor2|speed %speed2|delay %delay|s "
//% group="Motor" weight=83
//% inlineInputMode=inline
//% speed1.min=-255 speed1.max=255
//% speed2.min=-255 speed2.max=255
//% name.fieldEditor="gridpicker" name.fieldOptions.columns=5
export function MotorRunDualDelay(motor1: Motors, speed1: number, motor2: Motors, speed2: number, delay: number): void {
    MotorRun(motor1, speed1);
    MotorRun(motor2, speed2);
	basic.pause(delay * 1000);
	MotorRun(motor1, 0);
    MotorRun(motor2, 0);
    }

//% blockId="motorbit_rus04" block="On-board Ultrasonic part %index show color %rgb effect %effect" 
//% group="RUS-04" weight=78
export function motorbit_rus04(index: RgbUltrasonics, rgb: RgbColors, effect: ColorEffect): void {
    sensors.board_rus04_rgb(DigitalPin.P16, 4, index, rgb, effect);
}
    
//% blockId=Ultrasonic_reading_distance block="On-board Ultrasonic reading distance"
//% group="RUS-04" weight=77
export function Ultrasonic_reading_distance(): number {
    return sensors.Ultrasonic(DigitalPin.P2);
}


//% blockId=Setting_the_on_board_lights block="Setting the on-board lights %index color %rgb"
//% group="RGB" weight=76
export function Setting_the_on_board_lights(index: Offset,rgb: RgbColors): void {
 sensors.board_rus04_rgb(DigitalPin.P16, index, 0, rgb, rgb_ColorEffect.None);
}
	
//% blockId=close_the_on_board_lights block="close the on-board lights %index color"
//% group="RGB" weight=75
export function close_the_on_board_lights(index: Offset): void {
 sensors.board_rus04_rgb(DigitalPin.P16, index, 0, RgbColors.Black, rgb_ColorEffect.None);
}
	
//% blockId=close_all_the_on_board_lights block="close all the on-board lights"
//% group="RGB" weight=74
export function close_all_the_on_board_lights(): void {
 sensors.board_rus04_rgb(DigitalPin.P16, 0, 0, RgbColors.Black, rgb_ColorEffect.None);
 sensors.board_rus04_rgb(DigitalPin.P16, 1, 0, RgbColors.Black, rgb_ColorEffect.None);
 sensors.board_rus04_rgb(DigitalPin.P16, 2, 0, RgbColors.Black, rgb_ColorEffect.None);
 sensors.board_rus04_rgb(DigitalPin.P16, 3, 0, RgbColors.Black, rgb_ColorEffect.None);
}
	
}
