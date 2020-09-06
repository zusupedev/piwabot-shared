const amqplib = require('amqplib')
const ReconnectTimeout = 2000

const wait = (ms) => new Promise((resolve, _) => setTimeout(resolve, ms))

class Channel {
    /**
     * @type {import('amqplib').ConfirmChannel | import('amqplib').Channel}
     */
    _chan = null

    _log(info, error = false) {
        this.debug && (
            console[!error ? 'log' : 'error'](info)
        )
    }

    constructor(queue, debug = false) {
        this.queue = queue
        this.debug = debug
    }

    async _createChannel() {
        throw new Error('Not implemented.')
    }

    async _tryConnect(resolve, _) {
        try {
            this._conn = await amqplib.connect(`amqp://${RabbitMQServerHostname}`)

            this._conn.on('error', err => this._log(err, true))
            this._conn.on('close', this.connect)

            this._chan = await this._createChannel()

            await this._chan.assertQueue(this.queue)
            this._chan.on('close', () => { this._chan = null })

            resolve(this)
        } catch (err) {
            this._log(err, true);
            this._chan && this._chan.close()

            wait(ReconnectTimeout).then(() => this._tryConnect(resolve, _))
        }
    }


    /**
     * @returns {Promise<Channel>}
     */
    connect() {
        return new Promise(this._tryConnect.bind(this))
    }
}

class Consumer extends Channel {
    /**
     * Create a consumer channel
     * @param {string} queue 
     * @param {(obj) => Promise<void>} onMessage 
     * @param {boolean} debug 
     */
    constructor(queue, onMessage, debug = false) {
        super(queue, debug)

        this.onMessage = onMessage
    }

    async _createChannel() {
        return await this._conn.createChannel()
    }

    async connect() {
        await super.connect()
        this._chan.consume(this.queue, async (msg) => {
            try {
                const obj = JSON.parse(msg.content.toString('utf-8'))
                await this.onMessage(obj)

                this._chan.ack(msg)
            } catch (err) {
                console.log(err)
                this._chan.reject(msg, true)
            }
        }).catch(err => this._log(err, true))

        return this
    }
}

class Producer extends Channel {
    constructor(queue, debug = false) {
        super(queue, true)
    }

    async _createChannel() {
        return await this._conn.createConfirmChannel()
    }

    _offlineQueue = []

    _tryPublish(msg) {
        return new Promise((resolve, reject) => {
            const json = Buffer.from(JSON.stringify(msg), 'utf-8')
            this._chan.publish('', this.queue, json, {}, (err, _) => {
                err ? reject(err) : resolve()
            })
        })
    }

    async publish(msg) {
        this._offlineQueue.push(msg)

        if (!this._chan) return;

        while (this._offlineQueue.length > 0) {
            const msg = this._offlineQueue.pop()

            try { 
                await this._tryPublish(msg)
            } catch (err) {
                this._log(err, true)
                this._chan.close()
                
                this._offlineQueue.push(msg)
                break
            }  
        }
    }
}

module.exports = { Consumer, Producer }