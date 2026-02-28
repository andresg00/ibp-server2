/**
 * Extrae datos de un producto de Homecenter desde HTML
 * @param {Object} $ - Instancia de Cheerio (opcional, si no se provee se crea una nueva)
 * @returns {Object} - Objeto con los datos del producto
 */
function extraerProducto($) {
  // --- MÉTODO 1: Extraer del JSON de __NEXT_DATA__ (más completo) ---
  const nextData = extraerNextData($);
  const searchData = nextData?.props?.pageProps?.productProps?.result;
  let producto = null;
  if (searchData && Object.keys(searchData).length > 0) {
    producto = extraerProductoDesdeJSON(searchData, $);
  } else {
    // --- MÉTODO 2: Extraer directamente del HTML (fallback) ---
    producto = extraerProductoDesdeHTML($);
  }

  const final = {
    id: producto.id,
    nombre: producto.nombre,
    marca: producto.marca,
    precio: producto.precio?.valor || null,
    unidad: producto.precio?.unidad || "Und",
    rating: producto.promedioResenas
      ? parseFloat(producto.promedioResenas)
      : null,
    images: producto.imagenes.map((img) => img.url),
    // @ts-ignore
    numero_reviews: parseInt(producto.totalResenas) || 0,
    producto_url: `https://www.homecenter.com.co/homecenter-co/product/${producto.id}/${producto.nombre?.toLowerCase().replace(/\s+/g, "-")}/${producto.id}/`,
  };
  return final;
}
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

/**
 * Extrae el JSON de __NEXT_DATA__
 */
function extraerNextData($) {
  const nextDataScript = $("#__NEXT_DATA__").first();
  if (!nextDataScript.length) return null;

  try {
    return JSON.parse(nextDataScript.html());
  } catch (e) {
    console.error("Error parseando __NEXT_DATA__:", e);
    return null;
  }
}

/**
 * Extrae producto desde el JSON de __NEXT_DATA__
 */
function extraerProductoDesdeJSON(productoRaw, $) {
  // Función helper para extraer texto (por si necesitamos combinar con HTML)
  const extractText = (selector, defaultValue = "") => {
    const element = $(selector).first();
    return element.length ? element.text().trim() : defaultValue;
  };

  const producto = {
    id: productoRaw.id || "",
    sku: productoRaw.id || "",
    nombre: productoRaw.name || extractText("h1.product-title"),
    marca: productoRaw.brandName || extractText(".product-brand button"),
    descripcion: productoRaw.description || "",
    descripcionLarga: productoRaw.longDescription || "",
    precio: null,
    precioUnitario: null,
    disponibilidad: [],
    imagenes: [],
    especificaciones: {},
    resenas: [],
    promedioResenas: null,
    totalResenas: 0,
    categoria: "",
    breadcrumbs: [],
  };

  // Extraer precios de las variantes
  if (productoRaw.variants && productoRaw.variants.length > 0) {
    const variante = productoRaw.variants[0];

    if (variante.price && Array.isArray(variante.price)) {
      variante.price.forEach((precio) => {
        if (precio.type === "NORMAL") {
          producto.precio = {
            valor: precio.priceWithoutFormatting,
            valorFormateado: `${precio.symbol || "$"}${precio.price || ""}`,
            unidad: precio.unit || "",
          };
        } else if (precio.type === "M2") {
          producto.precioUnitario = {
            valor: precio.priceWithoutFormatting,
            valorFormateado: `${precio.symbol || "$"}${precio.price || ""}`,
            unidad: precio.unit || "",
            cobertura: precio.boxCoverage || "",
          };
        }
      });
    }

    // Extraer disponibilidad
    if (variante.availability) {
      variante.availability.forEach((disp) => {
        producto.disponibilidad.push({
          tipo: disp.shippingType || "",
          stock: disp.hasStock || false,
        });
      });
    }

    // Extraer imágenes
    if (variante.images) {
      variante.images.forEach((img) => {
        producto.imagenes.push({
          nombre: img.name || "",
          url: img.url || "",
        });
      });
    }
  }

  // Extraer especificaciones técnicas
  if (productoRaw.attributes) {
    productoRaw.attributes.forEach((attr) => {
      if (attr.name && attr.values && attr.values.length > 0) {
        producto.especificaciones[attr.name] = attr.values[0];
      }
    });
  }

  // Extraer breadcrumbs del HTML si están disponibles
  const breadcrumbItems = [];
  $('.bread-crumb a[itemprop="item"]').each((i, el) => {
    const $el = $(el);
    breadcrumbItems.push({
      nombre: $el.find('[itemprop="name"]').text().trim() || $el.text().trim(),
      url: $el.attr("href") || "",
    });
  });
  producto.breadcrumbs = breadcrumbItems;

  // Si hay categoría en los breadcrumbs, tomar la última
  if (breadcrumbItems.length > 0) {
    producto.categoria = breadcrumbItems[breadcrumbItems.length - 1].nombre;
  }

  // Extraer reseñas del JSON-LD (schema.org)
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const jsonLD = JSON.parse($(el).html());
      if (jsonLD["@type"] === "product" || jsonLD["@type"] === "Product") {
        if (jsonLD.aggregateRating) {
          producto.promedioResenas = jsonLD.aggregateRating.ratingValue;
          producto.totalResenas = jsonLD.aggregateRating.reviewCount || 0;
        }

        if (jsonLD.reviews) {
          jsonLD.reviews.forEach((review) => {
            producto.resenas.push({
              id: review.id || "",
              titulo: review.headline || "",
              contenido: review.reviewBody || "",
              autor: review.author?.name || "",
              calificacion: review.reviewRating?.ratingValue || null,
              fecha: review.datePublished || "",
            });
          });
        }
      }
    } catch (e) {
      // Ignorar errores de parseo JSON-LD
    }
  });
  //formato del producto final:
  //   const producto = {
  //   id: item.productId || item.skuId,
  //   nombre: item.displayName,
  //   marca: item.brand,
  //   precio: item.prices?.[0]?.priceWithoutFormatting || null,
  //   unidad: item.prices?.[0]?.unit || "Und",
  //   rating: item.rating ? parseFloat(item.rating) : null,
  //   numero_reviews: item.totalReviews ? parseInt(item.totalReviews) : 0,
  //   producto_url: `https://www.homecenter.com.co/homecenter-co/product/${item.productId}/${item.displayName?.toLowerCase().replace(/\s+/g, "-")}/${item.productId}/`,
  // };

  return producto;
}

/**
 * Extrae producto directamente desde el HTML (fallback)
 */
function extraerProductoDesdeHTML($) {
  // Función helper para extraer texto
  const extractText = (selector, defaultValue = "") => {
    const element = $(selector).first();
    return element.length ? element.text().trim() : defaultValue;
  };

  const producto = {
    id: "",
    sku: "",
    nombre:
      extractText("h1.product-title") ||
      extractText("title").split("-")[0].trim(),
    marca: extractText(".product-brand button"),
    descripcion: "",
    precio: null,
    precioUnitario: null,
    disponibilidad: [],
    imagenes: [],
    especificaciones: {},
    promedioResenas: null,
    totalResenas: 0,
    breadcrumbs: [],
  };

  // Extraer SKU/Código
  const codigoText = extractText(".product-cod-in-model, .product-cod");
  const match = codigoText.match(/(\d+)/);
  if (match) {
    producto.id = match[1];
    producto.sku = match[1];
  }

  // Extraer precio
  const precioContainer = $(".product-price").first();
  if (precioContainer.length) {
    const primaryPrice = precioContainer.find(".primary").first();
    if (primaryPrice.length) {
      const priceText = primaryPrice.text().trim();
      producto.precio = {
        valorFormateado: priceText,
      };

      // Intentar extraer valor numérico
      const priceMatch = priceText.match(/[\$\$]?\s*([\d\.]+)/);
      if (priceMatch) {
        const valor = priceMatch[1].replace(/\./g, "");
        if (!isNaN(valor)) {
          producto.precio.valor = parseInt(valor, 10);
        }
      }
    }

    // Precio por unidad (PUM)
    const pumPrice = precioContainer.find(".pum").first();
    if (pumPrice.length) {
      producto.precioUnitario = {
        valorFormateado: pumPrice.text().trim(),
      };
    }
  }

  // Extraer breadcrumbs
  $('.bread-crumb a[itemprop="item"]').each((i, el) => {
    const $el = $(el);
    producto.breadcrumbs.push({
      nombre: $el.find('[itemprop="name"]').text().trim() || $el.text().trim(),
      url: $el.attr("href") || "",
    });
  });

  // Extraer imágenes
  const imagenesVistas = new Set();
  $('img[id*="product-swatch"], img[id="pdpMainImage-"]').each((i, el) => {
    const src = $(el).attr("src");
    if (src && !imagenesVistas.has(src) && src.includes("falabella")) {
      imagenesVistas.add(src);
      producto.imagenes.push({
        url: src,
        id: $(el).attr("id") || "",
      });
    }
  });

  // Si no hay imágenes con los selectores anteriores, buscar cualquier imagen del producto
  if (producto.imagenes.length === 0) {
    $('img[src*="sodimacCO"]').each((i, el) => {
      const src = $(el).attr("src");
      if (src && !imagenesVistas.has(src)) {
        imagenesVistas.add(src);
        producto.imagenes.push({
          url: src,
          id: $(el).attr("id") || "",
        });
      }
    });
  }

  // Extraer especificaciones de la ficha técnica
  const techSpecs = $("#Ficha\\ técnica .content").first();
  if (techSpecs.length) {
    techSpecs.find(".attribute").each((i, el) => {
      const $el = $(el);
      const key = $el.find(".key").text().trim();
      const value = $el.find(".value").text().trim();
      if (key && value) {
        producto.especificaciones[key] = value;
      }
    });
  }

  // Extraer disponibilidad de la sección de entrega
  $(".delivery-type").each((i, el) => {
    const $el = $(el);
    const tipoText = $el.find(".delivery-type").text().trim();
    let tipo = "unknown";

    if (tipoText.includes("Envío")) tipo = "homeDelivery";
    else if (tipoText.includes("Retiro")) tipo = "pickupInStore";
    else if (tipoText.includes("tienda")) tipo = "buyAtStore";

    // Asumimos que tiene stock si aparece la opción
    producto.disponibilidad.push({
      tipo: tipo,
      stock: true,
    });
  });

  // Extraer reseñas del JSON-LD
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      const jsonLD = JSON.parse($(el).html());
      if (jsonLD["@type"] === "product" || jsonLD["@type"] === "Product") {
        if (jsonLD.aggregateRating) {
          producto.promedioResenas = jsonLD.aggregateRating.ratingValue;
          producto.totalResenas = jsonLD.aggregateRating.reviewCount || 0;
        }
      }
    } catch (e) {
      // Ignorar errores
    }
  });

  return producto;
}

// Exportar para usar en otros módulos
module.exports = {
  extraerProducto,
  extraerNextData,
};
