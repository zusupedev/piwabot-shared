const amqplib = require('amqplib')
const { RabbitMQServerHostname } = require('./index')

/**
 * @param {string} queue Queue's identifier
 * @returns {Promise<import('amqplib').Channel>}
 */
const createChannel = (queue) => new Promise ((resolve, reject) => {
    amqplib.connect(`amqp://${RabbitMQServerHostname}`)
        .then(connection => connection.createChannel())
        .then(channel => {
            channel.assertQueue(queue); resolve(channel) 
        }).catch(reject)
})

const wait = (ms) => new Promise((rs, _) => setTimeout(rs, ms))  

class Producer {
    /**
     * @type {import('amqplib').Channel}
     * @private
     */
    _channel
    
    _running = false

    constructor(queue) {
        this.queue = queue
    }

    async connect() {
        try {
            this._channel = await createChannel(this.queue);
        }
        catch (e) {
            console.error(e); setTimeout(() => this.connect(), 2000) 
        }
    }

    publish(obj) {
        const buffer = Buffer.from(JSON.stringify(obj), 'utf-8')
        this._channel.sendToQueue(this.queue, buffer)
    }

    async destroy() {
        this._running = false
        await this._channel.close()
    }
}

class Consumer {
    /**
     * @type {import('amqplib').Channel}
     * @private
     */
    _channel
    
    _running = false

    /**
     * @param {string} queue Queue's identifier 
     * @param {(any) => Promise<void>} onMessage Callback invoked when a message is received.
     */
    constructor(queue, onMessage) {
        this.onMessage = onMessage
        this.queue = queue
    }

    _fetchMessage() {
        if (!this._running) return;

        this._channel.consume(this.queue, async (msg) => {
            const obj = JSON.parse(msg.content.toString('utf-8'))

            try {
                await this.onMessage(obj)
                this._channel.ack(msg)
            } catch (e) {
                console.log(e)
                this._channel.reject(msg, true)
            }
            
        }, { noAck: false }).catch((e) => {
            if (this._running) {
                console.error(e); this.connect();
            }
        })
    }
    
    async connect() {
        while (true) {
            try {
                this._channel = await createChannel(this.queue);
                
                this._running = true
                this._fetchMessage()

                return this
            }
            catch (e) {
                console.error(e); await wait(2000)
            }
        }
    }

    async destroy() {
        this._running = false
        await this._channel.close()
    }
}

module.exports = {Consumer, Producer}