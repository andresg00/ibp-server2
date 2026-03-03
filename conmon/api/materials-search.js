const axios = require("axios");
const cheerio = require("cheerio");
const { extraerProducto: extraerProduct2 } = require("./material-extractor");
const {
  extraerProductos: extraerProductos2,
} = require("./material-extractor2");
const header = {
  // Es crucial imitar un navegador real para evitar ser bloqueado
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  // Algunos sitios pueden necesitar esta cabecera
  Referer: "https://www.google.com/",
};
const searchMaterials = async (req, res) => {
  // 1. Obtener el término de búsqueda de los query params (ej. /api/scrape?q=cemento+argos)
  //https://www.homecenter.com.co/homecenter-co/category/cat5510024/cementos-concreto-y-morteros/?sTerm=cenmento
  const query = req.query.q || "cemento argos";
  const url = `https://www.homecenter.com.co/homecenter-co/search/?Ntt=${encodeURIComponent(query)}`;

  console.log(`Scrapeando URL: ${url}`);

  try {
    //aplicar timeout para evitar bloqueos
    // @ts-ignore
    const response = await axios.get(url, {
      headers: header,
      // timeout: 60 * 1000, // 30 segundos de timeout
    });
    // 3. Cargar el HTML en cheerio
    const $ = cheerio.load(response.data);
    const productosExtraidos = extraerProductos2($);
    if (productosExtraidos && productosExtraidos.length > 0) {
      return res.json({
        success: true,
        searchTerm: query,
        data: productosExtraidos,
      });
    } else {
      return res.json({
        success: false,
        searchTerm: query,
        data: [],
        message:
          "No se encontraron productos para el término de búsqueda proporcionado.",
      });
    }
  } catch (error) {
    console.error("Error durante el scraping:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener los datos del sitio web",
      details: error,
    });
  }
};
const updateMaterial = async (req, res) => {
  const { id, name } = req.body;
  const url = `https://www.homecenter.com.co/homecenter-co/product/${id}/${name}/${id}/`;
  //https://www.homecenter.com.co/homecenter-co/product/91606/puntilla-con-cabeza-2pg-500g/91606/
  try {
    // @ts-ignore
    const response = await axios.get(url, {
      headers: header,
    });
    const $ = cheerio.load(response.data);
    const producto = extraerProduct2($);

    res.json({
      success: true,
      data: producto,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Error al obtener los datos del producto",
      details: error.message,
      url: url,
    });
  }
};
module.exports = {
  searchMaterials,
  updateMaterial,
};
