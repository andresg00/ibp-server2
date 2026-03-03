const e = require("express");

function parseProduct(item) {
  const producto = {
    id: item.id || "",
    nombre: item.nombre || "Sin Nombre",
    marca: item.marca || "Desconocida",
    precio: item.precio || 0,
    unidad: item.unidad || "Und",
    rating: item.rating ? parseFloat(item.rating) : 0,
    numero_reviews: item.total_resenas ? parseInt(item.total_resenas) : 0,
    producto_url: item.url || "",
    images: item.images || [],
  };

  return producto;
}
/**
 * Extrae una lista de productos de una página de resultados de búsqueda de Homecenter usando Cheerio.
 *
 * Primero intenta parsear el objeto JSON global __NEXT_DATA__.
 * Si falla, intenta parsear el HTML directamente con Cheerio.
 *
 * @param {Function} $ - El objeto Cheerio (cargado con el HTML).
 * @returns {Array<Object>|null} - Un array de objetos, cada uno representando un producto.
 *                                  Retorna null si no se puede extraer ningún producto.
 */
function extraerProductos($) {
  // --- 1. INTENTAR EXTRAER DEL JSON __NEXT_DATA__ (MÉTODO PREFERIDO) ---
  const nextDataScript = $("#__NEXT_DATA__");

  if (nextDataScript.length > 0) {
    try {
      // Cheerio no tiene .textContent, se usa .text()
      const jsonContent = JSON.parse(nextDataScript.text());

      // Navegación por el JSON para llegar a los resultados
      const results =
        jsonContent?.props?.pageProps?.searchProps?.searchData?.results;

      if (results && Array.isArray(results)) {
        console.log("--- Productos extraídos del JSON __NEXT_DATA__ ---");
        const productosExtraidos = results.map((item) => {
          // Extraemos la info más relevante, pero el JSON tiene MUCHO más
          const price = item.prices?.[0]?.priceWithoutFormatting;
          const producto = {
            createdAt: new Date(),
            productId: item.productId,
            // skuId: item.skuId,
            name: item.displayName,
            brand: item.brand,
            url: `https://www.homecenter.com.co/homecenter-co/product/${item.productId}/${item.displayName?.replace(/\s+/g, "-")}/${item.productId}/`,
            images: item.mediaUrls || [],
            priceHistory: price ? { date: new Date(), price } : null,
            // currency: item.prices?.[0]?.symbol || null,
            // priceText: item.prices?.[0]?.price || null,
            unit: item.prices?.[0]?.unit || null,
            rating: item.rating,
            totalReviews: item.totalReviews,
            // highlights: item.highlights || [],
            // events: item.events || [],
          };
          return parseProduct(producto);
        });
        return productosExtraidos;
      }
    } catch (error) {
      console.error("Error al parsear __NEXT_DATA__:", error.message);
      console.log("Se procederá con el análisis HTML.");
    }
  }

  // --- 2. MÉTODO DE RESPALDO: ANÁLISIS DEL HTML CON CHEERIO ---
  console.log(
    "--- No se pudo extraer del JSON. Intentando desde el HTML con Cheerio. ---",
  );

  // Buscar todos los contenedores de productos.
  // En este HTML, cada producto está dentro de un div con la clase 'product-wrapper'
  const contenedoresProductos = $('div[class*="product-wrapper"]');

  if (!contenedoresProductos || contenedoresProductos.length === 0) {
    console.log("No se encontraron contenedores de productos en el HTML.");
    return null;
  }

  const productosExtraidos = [];

  contenedoresProductos.each((index, elemento) => {
    const $contenedor = $(elemento);
    try {
      // Intentamos obtener el ID del producto, que es un atributo 'data-key' en el div padre
      const productId = $contenedor.attr("data-key");

      // Marca
      const $marcaTag = $contenedor.find('div[class*="product-brand"]');
      const marca = $marcaTag.length ? $marcaTag.text().trim() : null;

      // Nombre / Título
      const $tituloTag = $contenedor.find('h2[class*="product-title"]');
      const titulo = $tituloTag.length ? $tituloTag.text().trim() : null;

      // Imagen
      const $imgTag = $contenedor.find('img[class*="image-base"]');
      // El src puede estar en 'src' o en 'data-src' (para lazy loading)
      let imgUrl = null;
      if ($imgTag.length) {
        imgUrl = $imgTag.attr("src") || $imgTag.attr("data-src");
      }

      // URL del producto (a partir del link del título o de la imagen)
      const $linkTag = $contenedor.find("a[href]").first();
      let urlProducto = null;
      if ($linkTag.length) {
        const href = $linkTag.attr("href");
        urlProducto = href.startsWith("/")
          ? `https://www.homecenter.com.co${href}`
          : href;
      }

      // Precios y Ratings (están en diferentes secciones para móvil y escritorio)
      // Es más complejo, por lo que aquí simplificamos.
      const $precioTag = $contenedor.find('span[class*="parsedPrice"]');
      const precioTexto = $precioTag.length ? $precioTag.text().trim() : null;

      let precioSinFormato = null;
      if (precioTexto) {
        // Limpiar el precio para obtener un número
        const match = precioTexto.match(/[\d.]+/);
        if (match) {
          precioSinFormato = parseFloat(match[0].replace(/\./g, ""));
        }
      }

      // Rating
      const $ratingTag = $contenedor.find('div[class*="ratings--container"]');
      let rating = null;
      if ($ratingTag.length) {
        // Contar estrellas llenas (un aproximado)
        const $estrellasLlenas = $ratingTag.find('i[class*="star-filled"]');
        rating = $estrellasLlenas.length;
      }

      const pr = {
        createdAt: new Date(),
        productId: productId,
        name: titulo,
        brand: marca,
        url: urlProducto,
        images: [imgUrl],
        priceHistory: precioSinFormato
          ? [{ date: new Date(), price: precioSinFormato }]
          : null,
        unit: null,
        rating: rating,
        totalReviews: null,
      };
      const producto = parseProduct(pr);
      productosExtraidos.push(producto);
    } catch (error) {
      console.error(
        "Error procesando un contenedor de producto:",
        error.message,
      );
    }
  });

  if (productosExtraidos.length > 0) {
    return productosExtraidos;
  }

  return null;
}

// --- EJEMPLO DE USO (con Node.js y Cheerio) ---
/*
const axios = require('axios');
const cheerio = require('cheerio');

async function main() {
    try {
        const url = 'https://www.homecenter.com.co/homecenter-co/search/?Ntt=ladrillo';
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        
        const productos = extraerProductos($);
        
        if (productos) {
            console.log(`Se extrajeron ${productos.length} productos.`);
            console.log('Ejemplo del primer producto:', JSON.stringify(productos[0], null, 2));
        } else {
            console.log('No se pudieron extraer productos.');
        }
    } catch (error) {
        console.error('Error al obtener la página:', error.message);
    }
}

*/
exports.extraerProductos = extraerProductos;
