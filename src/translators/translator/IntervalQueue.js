/**
 * 间隔执行队列
 */
class IntervalQueue {
    queue = []
    isRunning = false

    /**
     * @param fn 执行函数
     * @param delay 执行间隔
     * @param timeout 超时时间
     */
    constructor(fn, delay, timeout) {
        this.fn = fn
        this.delay = delay
        this.timeout = timeout
    }

    async wait(delay = this.delay) {
        await new Promise(resolve => setTimeout(resolve, delay))
    }

    async run() {
        if (this.isRunning) return
        let item
        while ((item = this.queue.shift())) {
            const { args, resolve, reject } = item
            this.isRunning = true
            try {
                const result = await this.fn(...args)
                resolve(result)
            } catch (e) {
                reject(e)
            }
            await this.wait()
        }
        this.isRunning = false
    }

    /**
     * 执行一次fn
     * @param args fn的入参
     * @returns 返回fn的返回值的Promise
     */
    execute(...args) {
        return new Promise((resolve, reject) => {
            this.queue.push({ args, resolve, reject })
            this.run()
            if (this.timeout) {
                setTimeout(() => {
                    reject(new Error('IntervalQueue timeout'))
                }, this.timeout)
            }
        })
    }
}

module.exports = {
    IntervalQueue
}
