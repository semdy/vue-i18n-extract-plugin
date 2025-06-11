const { IntervalQueue } = require("./IntervalQueue");

class Translator {
  option = {};

  constructor(option) {
    this.option = this.getResultOption(option);
  }

  defaultErrorHandler = error => {
    const name = this.option.name;
    console.error(error);
    console.error(
      `翻译api${name ? `【${name}】` : ""}请求异常：${this.getErrorMessage(error)}`
    );
  };

  getResultOption(option) {
    const resultOption = {
      version: 1,
      maxChunkSize: 4500, // 目前默认是4500
      interval: 0,
      onError: this.defaultErrorHandler,
      ...option
    };
    if (resultOption.interval) {
      const getIntervalFn = (fn, delay) => {
        const queue = new IntervalQueue(fn.bind(null), delay);
        return (...args) => {
          return queue.execute(...args);
        };
      };
      resultOption.fetchMethod = getIntervalFn(
        resultOption.fetchMethod,
        resultOption.interval
      );
    }
    return resultOption;
  }

  getErrorMessage(error) {
    if (error instanceof Error) {
      return error.message;
    } else {
      return String(error);
    }
  }

  async translate(text, fromKey, toKey, separator) {
    let result = "";
    try {
      result = await this.option.fetchMethod(text, fromKey, toKey, separator);
    } catch (error) {
      this.option.onError(error, this.defaultErrorHandler);
    }
    return result;
  }
}

module.exports = {
  Translator
};
