const { getReviews } = require("../conmon/api/reviews");

module.exports = async function handler(req, res) {
  return await getReviews(req, res);
};
