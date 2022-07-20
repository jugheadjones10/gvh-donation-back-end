module.exports = async function hey(callback) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(
        promiseTakingTime()
          .then(() => {
            return promiseTakingTime();
          })
          .then(() => {
            callback();
          })
      );
    }, 500);
  });
};

function promiseTakingTime() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 100);
  });
}
