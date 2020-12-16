
namespace Bus_Servo {

    let Rx_Data: Buffer = pins.createBuffer(8)
    let Rx_index: number = 0
    let Rx_Flag: number = 0
    let RecvFlag: number = 0

    let Read_Servo_Service: number = 0

    function sendCmdToSerial(command: Buffer) {
        serial.writeBuffer(command)
    }

    function readSerial() {
        let responseBuffer: Buffer = pins.createBuffer(8);
        let readBuf: Buffer
        let Rx_Temp: number = 0

        while (true) {
            readBuf = serial.readBuffer(1);
            Rx_Temp = readBuf.getNumber(NumberFormat.UInt8LE, 0)
            switch(Rx_Flag)
            {
            case 0:
                if(Rx_Temp == 0xFF)
                {
                    Rx_Data.setNumber(NumberFormat.UInt8LE, 0, 0xFF)
                    Rx_Flag = 1
                }
                else if (Rx_Temp == 0xF5)
                {
                    Rx_Data.setNumber(NumberFormat.UInt8LE, 0, 0xFF)
                    Rx_Data.setNumber(NumberFormat.UInt8LE, 1, 0xF5)
                    Rx_Flag = 2
                    Rx_index = 2
                }
                break

            case 1:
                if(Rx_Temp == 0xF5)
                {
                    Rx_Data.setNumber(NumberFormat.UInt8LE, 1, 0xF5)
                    Rx_Flag = 2;
                    Rx_index = 2;
                } else
                {
                    Rx_Flag = 0
                    Rx_Data.setNumber(NumberFormat.UInt8LE, 0, 0x00)
                }
                break

            case 2:
                Rx_Data[Rx_index] = Rx_Temp;
                Rx_Data.setNumber(NumberFormat.UInt8LE, Rx_index, Rx_Temp)
                Rx_index++

                if(Rx_index >= 8)
                {
                    Rx_Flag = 0
                    Rx_Temp = 0
                    RecvFlag = 1
                }
                break

            default:
                break
            }
        }
    }

    function bus_servo_get_value(): number {

        let s_id = Rx_Data.getNumber(NumberFormat.UInt8LE, 2)
        let len = Rx_Data.getNumber(NumberFormat.UInt8LE, 3)
        let state = Rx_Data.getNumber(NumberFormat.UInt8LE, 4)
        let value_H = Rx_Data.getNumber(NumberFormat.UInt8LE, 5)
        let value_L = Rx_Data.getNumber(NumberFormat.UInt8LE, 6)
        let check = Rx_Data.getNumber(NumberFormat.UInt8LE, 7)
        let value = 0

        let checknum = (~(s_id + len + state + value_H + value_L)) & 0xFF;
        if(checknum == check) {
            value = (value_H << 8) + value_L;
        }
        for (let i: number = 0; i < 8; i++) {
            Rx_Data.setNumber(NumberFormat.UInt8LE, i, 0)
        }

        return value
    }


    //% blockId=bus_servo_controlServo block="controlServo %id|value %value|time %time"
    //% weight=30
    //% time.defl=1000
    //% id.defl=1
    //% id.max=254
    //% id.min=1
    export function controlServo(id: number, value: number, time: number) {

        let temp_buf: Buffer = pins.createBuffer(11)
        let s_id = id & 0xFF
        let len = 0x07
        let cmd = 0x03
        let addr = 0x2A
        let pos_H = (value >> 8) & 0xFF
        let pos_L = value & 0xFF
        let time_H = (time >> 8) & 0xFF
        let time_L = time & 0xFF
        let checknum = (~(s_id + len + cmd + addr + pos_H + pos_L + time_H + time_L)) & 0xFF

        temp_buf.setNumber(NumberFormat.UInt8LE, 0, 0xFF)
        temp_buf.setNumber(NumberFormat.UInt8LE, 1, 0xFF)
        temp_buf.setNumber(NumberFormat.UInt8LE, 2, s_id)
        temp_buf.setNumber(NumberFormat.UInt8LE, 3, len)
        temp_buf.setNumber(NumberFormat.UInt8LE, 4, cmd)
        temp_buf.setNumber(NumberFormat.UInt8LE, 5, addr)
        temp_buf.setNumber(NumberFormat.UInt8LE, 6, pos_H)
        temp_buf.setNumber(NumberFormat.UInt8LE, 7, pos_L)
        temp_buf.setNumber(NumberFormat.UInt8LE, 8, time_H)
        temp_buf.setNumber(NumberFormat.UInt8LE, 9, time_L)
        temp_buf.setNumber(NumberFormat.UInt8LE, 10, checknum)

        sendCmdToSerial(temp_buf)
    }

    //% blockId=bus_servo_readValue block="readValue %id"
    //% weight=31
    //% id.defl=1
    //% id.max=254
    //% id.min=1
    export function readValue(id: number): number {

        if (!Read_Servo_Service) {
            Read_Servo_Service = 1
            control.inBackground(readSerial)
        }

        let temp_buf: Buffer = pins.createBuffer(8)
        let s_id = id & 0xFF
        let len = 0x04
        let cmd = 0x02
        let param_H = 0x38
        let param_L = 0x02
        let checknum = (~(s_id + len + cmd + param_H + param_L)) & 0xFF
        let value: number = 0

        temp_buf.setNumber(NumberFormat.UInt8LE, 0, 0xFF)
        temp_buf.setNumber(NumberFormat.UInt8LE, 1, 0xFF)
        temp_buf.setNumber(NumberFormat.UInt8LE, 2, s_id)
        temp_buf.setNumber(NumberFormat.UInt8LE, 3, len)
        temp_buf.setNumber(NumberFormat.UInt8LE, 4, cmd)
        temp_buf.setNumber(NumberFormat.UInt8LE, 5, param_H)
        temp_buf.setNumber(NumberFormat.UInt8LE, 6, param_L)
        temp_buf.setNumber(NumberFormat.UInt8LE, 7, checknum)
        sendCmdToSerial(temp_buf)

        control.waitMicros(2)
        if (RecvFlag) {
            RecvFlag = 0
            value = bus_servo_get_value()
        }
        else {
            value = 0 
        }

        return value
    }
}
