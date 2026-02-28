const axios = require("axios");
const cheerio = require("cheerio");
const { extraerProducto: extraerProduct2 } = require("./extraer-producto");
function extraerUrlImagen(item) {
  // Si no hay nada, retornar null
  if (!item) return null;

  // 1. Intentar con mediaUrls (primera opción)
  if (item.mediaUrls && item.mediaUrls.length > 0) {
    const urlConParametros = item.mediaUrls.find((u) => u.includes("/w="));
    if (urlConParametros) {
      return urlConParametros
        .replace("/w=200,", "/w=800,")
        .replace(",h=200,", ",h=800,")
        .replace("q=85", "q=90");
    }

    // Usar la primera URL y mejorarla
    const urlBase = item.mediaUrls[item.mediaUrls.lenght - 1].replace(
      "/public",
      "",
    );
    return `${urlBase}/w=800,h=800,f=webp,fit=contain,q=90`;
  }

  // 2. Intentar con media.id
  if (item.media?.id) {
    // Probar diferentes variaciones
    const id = item.media.id;
    const skuId = item.skuId || item.productId;

    // Si el ID parece numérico y simple
    if (/^\d+$/.test(id)) {
      // Para productos como 220877, probar con sufijos comunes
      const sufijos = ["_01", "_02", "_1", "_17", "_18", "_28", ""];

      // Si el ID coincide con skuId, probablemente necesite sufijo
      if (id === skuId) {
        return `https://media.falabella.com/sodimacCO/${id}_01/w=800,h=800,f=webp,fit=contain,q=90`;
      }
    }

    // URL por defecto
    return `https://media.falabella.com/sodimacCO/${id}/w=800,h=800,f=webp,fit=contain,q=90`;
  }

  // 3. Intentar con productId
  if (item.productId) {
    return `https://media.falabella.com/sodimacCO/${item.productId}_01/w=800,h=800,f=webp,fit=contain,q=90`;
  }

  // 4. Último recurso: usar skuId
  if (item.skuId) {
    return `https://media.falabella.com/sodimacCO/${item.skuId}_01/w=800,h=800,f=webp,fit=contain,q=90`;
  }

  return null;
}
// Función para extraer los datos del script __NEXT_DATA__
function extraerNextData($) {
  try {
    // Buscar el script con id "__NEXT_DATA__"
    const nextDataScript = $("script#__NEXT_DATA__");

    if (!nextDataScript.length) {
      console.log("No se encontró script __NEXT_DATA__");
      return null;
    }

    // Obtener el contenido HTML del script
    const contenido = nextDataScript.html();

    // Parsear el JSON
    const nextData = JSON.parse(contenido);

    return nextData;
  } catch (e) {
    console.error("Error parseando __NEXT_DATA__:", e.message);
    return null;
  }
}
function extraerProducto(item) {
  const producto = {
    id: item.productId || item.skuId,
    nombre: item.displayName,
    marca: item.brand,
    precio: item.prices?.[0]?.priceWithoutFormatting || null,
    unidad: item.prices?.[0]?.unit || "Und",
    rating: item.rating ? parseFloat(item.rating) : null,
    numero_reviews: item.totalReviews ? parseInt(item.totalReviews) : 0,
    producto_url: `https://www.homecenter.com.co/homecenter-co/product/${item.productId}/${item.displayName?.toLowerCase().replace(/\s+/g, "-")}/${item.productId}/`,
    images: item.mediaUrls,
  };

  //   producto.imagen_url = extraerUrlImagen(item); // Limpiar barras invertidas
  // Extraer highlights/características si existen
  //   if (item.highlights && item.highlights.length > 0) {
  //     producto.caracteristicas = {};
  //     for (const highlight of item.highlights) {
  //       producto.caracteristicas[highlight.key] = highlight.value;
  //     }
  //   }
  return producto;
}

function extraerProductosDeNextData(nextData) {
  const productos = [];

  try {
    // Navegar por la estructura del objeto Next.js
    // La estructura es: props.pageProps.searchProps.searchData.results
    const searchData = nextData?.props?.pageProps?.searchProps?.searchData;

    if (!searchData || !searchData.results) {
      console.log("No se encontraron resultados en la estructura esperada");
      return productos;
    }

    const results = searchData.results;

    for (const item of results) {
      const producto = extraerProducto(item);
      productos.push(producto);
    }
  } catch (e) {
    console.error("Error extrayendo productos:", e.message);
  }

  return productos;
}
// Función para calcular el rating basado en los iconos de estrellas
function calcularRating(element, $) {
  const ratingsContainer = $(element)
    .find('[class*="ratings--container"]')
    .first();
  if (!ratingsContainer.length) return null;

  let rating = 0;
  let estrellaCount = 0;

  // Buscar todos los iconos de estrellas dentro del contenedor
  const estrellas = ratingsContainer.find('i[class*="cs-icon-star"]');

  estrellas.each((i, estrella) => {
    const clases = $(estrella).attr("class") || "";

    if (clases.includes("cs-icon-star-filled")) {
      rating += 1;
      estrellaCount++;
    } else if (clases.includes("cs-icon-star-half_filled")) {
      rating += 0.5;
      estrellaCount++;
    }
    // Las estrellas vacías no suman puntos pero cuentan para el total
    else if (clases.includes("cs-icon-star-empty")) {
      estrellaCount++;
    }
  });

  // Si encontramos estrellas, calculamos el promedio
  if (estrellaCount > 0) {
    // Normalmente son 5 estrellas, pero calculamos el promedio
    return parseFloat(((rating / estrellaCount) * 5).toFixed(1));
  }

  return null;
}
const searchMaterials = async (req, res) => {
  // 1. Obtener el término de búsqueda de los query params (ej. /api/scrape?q=cemento+argos)
  //https://www.homecenter.com.co/homecenter-co/category/cat5510024/cementos-concreto-y-morteros/?sTerm=cenmento
  const query = req.query.q || "cemento argos";
  const url = `https://www.homecenter.com.co/homecenter-co/search/?Ntt=${encodeURIComponent(query)}`;

  console.log(`Scrapeando URL: ${url}`);

  try {
    // 2. Hacer la petición HTTP con axios
    // @ts-ignore
    const response = await axios.get(url, {
      headers: {
        // Es crucial imitar un navegador real para evitar ser bloqueado
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        // Algunos sitios pueden necesitar esta cabecera
        Referer: "https://www.google.com/",
      },
    });

    // 3. Cargar el HTML en cheerio
    const $ = cheerio.load(response.data);
    // INTENTAR PRIMERO: Extraer datos de JSON-LD
    const datosJSON = extraerNextData($);
    let jsonProductos = extraerProductosDeNextData(datosJSON);
    if (jsonProductos.length > 0) {
      return res.json({
        success: true,
        count: jsonProductos.length,
        searchTerm: query,
        data: jsonProductos,
      });
    }
    // 4. Seleccionar los contenedores de productos
    // Usamos un selector que busca elementos con clase que contenga "product-wrapper"
    // Esto es más flexible que buscar la clase exacta 'jsx-643047726'
    const productos = [];

    $('[class*="product-wrapper"]').each((index, element) => {
      const producto = {};

      // --- Extraer datos (los selectores son muy similares a los de BeautifulSoup) ---

      // 4.1 ID (del atributo data-key)
      producto.id = $(element).attr("data-key");

      // 4.2 Marca
      const brandElement = $(element).find('[class*="product-brand"]').first();
      producto.marca = brandElement.text().trim() || null;

      // 4.3 Nombre del producto
      const titleElement = $(element)
        .find('h2[class*="product-title"]')
        .first();
      producto.nombre = titleElement.text().trim() || null;

      // 4.4 Precio
      const priceElement = $(element)
        .find('span[class*="parsedPrice"]')
        .first();
      if (priceElement.length) {
        let precioTexto = priceElement
          .text()
          .trim()
          .replace("$", "")
          .replace(/\./g, "");
        // Limpiar y convertir a número
        const precioNum = parseFloat(precioTexto.replace(",", "."));
        producto.precio = isNaN(precioNum) ? null : precioNum;

        // Unidad
        const unitElement = $(element)
          .find('span[class*="price-unit"]')
          .first();
        producto.unidad = unitElement.text().trim() || null;
      } else {
        producto.precio = null;
        producto.unidad = null;
      }

      // 4.5 Número de reseñas
      const reviewsElement = $(element).find('span[class*="reviews"]').first();
      if (reviewsElement.length) {
        const reviewsText = reviewsElement.text().trim();
        const match = reviewsText.match(/\((\d+)\)/);
        producto.numero_reviews = match ? parseInt(match[1], 10) : 0;
      } else {
        producto.numero_reviews = 0;
      }
      //  (rating) ---
      producto.rating = calcularRating(element, $);

      // Buscar específicamente el img que tiene un ID (que es el ID del producto)
      // o el que tiene la clase 'image-base'
      const imgElement = $(element).find("img.image-base, img[id]").first();

      if (imgElement.length) {
        // Primero intentar con src, si no con data-src
        producto.imagen_url =
          imgElement.attr("src") || imgElement.attr("data-src") || null;

        // Verificar que no sea el placeholder SVG
        if (
          producto.imagen_url &&
          producto.imagen_url.includes("data:image/svg")
        ) {
          // Si es el placeholder, buscar en el atributo data-src del mismo elemento
          producto.imagen_url = imgElement.attr("data-src") || null;
        }
      } else {
        // Fallback: buscar cualquier img que no sea SVG placeholder
        const allImages = $(element).find("img");
        for (let i = 0; i < allImages.length; i++) {
          const img = $(allImages[i]);
          const src = img.attr("src") || img.attr("data-src") || "";
          if (src && !src.includes("data:image/svg")) {
            producto.imagen_url = src;
            break;
          }
        }
      }

      // 4.7 URL del producto
      const linkElement = $(element).find('a[href*="/product/"]').first();
      if (linkElement.length) {
        let href = linkElement.attr("href");
        if (href) {
          producto.producto_url = href.startsWith("http")
            ? href
            : `https://www.homecenter.com.co${href}`;
        }
      }

      // Solo agregar si encontramos un nombre o ID
      if (producto.nombre || producto.id) {
        producto.images = [producto.imagen_url]; // Para mantener compatibilidad con el formato esperado
        productos.push(producto);
      }
    });

    // 5. Enviar los datos como respuesta JSON
    res.json({
      success: true,
      count: productos.length,
      searchTerm: query,
      data: productos,
    });
  } catch (error) {
    console.error("Error durante el scraping:", error.message);
    res.status(500).json({
      success: false,
      error: "Error al obtener los datos del sitio web",
      details: error.message,
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
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
