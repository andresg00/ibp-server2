module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  return res.status(200).send("Servidor funcionando 🚀");
};
