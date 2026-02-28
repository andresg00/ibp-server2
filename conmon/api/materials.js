// const express = require('express');
// const axios = require('axios');
// const cheerio = require('cheerio');

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Función para extraer datos JSON-LD de la página
// function extraerJSONLD($) {
//     const datosJSON = [];

//     // Buscar todos los scripts con tipo application/ld+json
//     $('script[type="application/ld+json"]').each((i, script) => {
//         try {
//             const contenido = $(script).html();
//             const jsonData = JSON.parse(contenido);

//             // Si es un array, procesamos cada elemento
//             if (Array.isArray(jsonData)) {
//                 datosJSON.push(...jsonData);
//             } else {
//                 datosJSON.push(jsonData);
//             }
//         } catch (e) {
//             // Ignorar errores de parseo
//         }
//     });

//     return datosJSON;
// }

// // Función para buscar productos en los datos JSON-LD
// function buscarProductosEnJSON(datosJSON) {
//     const productos = [];

//     for (const item of datosJSON) {
//         // Buscar items de tipo Product
//         if (item['@type'] === 'Product' || item['@type']?.includes('Product')) {
//             const producto = {
//                 id: item.sku || item.productID,
//                 nombre: item.name,
//                 marca: item.brand?.name,
//                 descripcion: item.description,
//                 imagen_url: item.image,
//                 producto_url: item.url,
//             };

//             // Extraer precio si existe
//             if (item.offers) {
//                 // Puede ser un array o un objeto
//                 const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
//                 producto.precio = offers.price ? parseFloat(offers.price) : null;
//                 producto.unidad = 'Und'; // Unidad por defecto
//             }

//             // Extraer rating si existe
//             if (item.aggregateRating) {
//                 producto.rating = item.aggregateRating.ratingValue;
//                 producto.numero_reviews = item.aggregateRating.reviewCount;
//             } else if (item.review) {
//                 const reviews = Array.isArray(item.review) ? item.review : [item.review];
//                 if (reviews.length > 0 && reviews[0].reviewRating) {
//                     producto.rating = reviews[0].reviewRating.ratingValue;
//                     producto.numero_reviews = reviews.length;
//                 }
//             }

//             productos.push(producto);
//         }

//         // Algunos sitios tienen los productos dentro de un ItemList
//         if (item['@type'] === 'ItemList' && item.itemListElement) {
//             for (const elemento of item.itemListElement) {
//                 if (elemento.item && elemento.item['@type'] === 'Product') {
//                     const producto = elemento.item;
//                     productos.push({
//                         id: producto.sku || producto.productID,
//                         nombre: producto.name,
//                         marca: producto.brand?.name,
//                         imagen_url: producto.image,
//                         precio: producto.offers?.price ? parseFloat(producto.offers.price) : null,
//                         producto_url: producto.url,
//                     });
//                 }
//             }
//         }
//     }

//     return productos;
// }

// // Función de scraping HTML (nuestro método original)
// function scrapearHTML($, element) {
//     const producto = {};

//     // ID
//     producto.id = $(element).attr('data-key');

//     // Marca
//     const brandElement = $(element).find('[class*="product-brand"]').first();
//     producto.marca = brandElement.text().trim() || null;

//     // Nombre
//     const titleElement = $(element).find('h2[class*="product-title"]').first();
//     producto.nombre = titleElement.text().trim() || null;

//     // Precio
//     const priceElement = $(element).find('span[class*="parsedPrice"]').first();
//     if (priceElement.length) {
//         let precioTexto = priceElement.text().trim().replace('$', '').replace(/\./g, '');
//         const precioNum = parseFloat(precioTexto.replace(',', '.'));
//         producto.precio = isNaN(precioNum) ? null : precioNum;

//         const unitElement = $(element).find('span[class*="price-unit"]').first();
//         producto.unidad = unitElement.text().trim() || null;
//     }

//     // Rating (calcular desde estrellas)
//     producto.rating = calcularRating(element, $);

//     // Número de reseñas
//     const reviewsElement = $(element).find('span[class*="reviews"]').first();
//     if (reviewsElement.length) {
//         const reviewsText = reviewsElement.text().trim();
//         const match = reviewsText.match(/\((\d+)\)/);
//         producto.numero_reviews = match ? parseInt(match[1], 10) : 0;
//     } else {
//         producto.numero_reviews = 0;
//     }

//     // Imagen
//     let imagenUrl = null;

//     if (producto.id) {
//         const imgWithId = $(element).find(`img[id="${producto.id}"]`).first();
//         if (imgWithId.length) {
//             imagenUrl = imgWithId.attr('src') || imgWithId.attr('data-src');
//         }
//     }

//     if (!imagenUrl || imagenUrl.includes('data:image/svg')) {
//         const imgBase = $(element).find('img.image-base').first();
//         imagenUrl = imgBase.attr('src') || imgBase.attr('data-src');
//     }

//     if (!imagenUrl || imagenUrl.includes('data:image/svg')) {
//         const allImages = $(element).find('img');
//         for (let i = 0; i < allImages.length; i++) {
//             const img = $(allImages[i]);
//             const src = img.attr('src') || img.attr('data-src') || '';
//             if (src.includes('media.falabella.com')) {
//                 imagenUrl = src;
//                 break;
//             }
//         }
//     }

//     producto.imagen_url = mejorarCalidadImagen(imagenUrl);

//     // URL del producto
//     const linkElement = $(element).find('a[href*="/product/"]').first();
//     if (linkElement.length) {
//         let href = linkElement.attr('href');
//         if (href) {
//             producto.producto_url = href.startsWith('http') ? href : `https://www.homecenter.com.co${href}`;
//         }
//     }

//     return producto;
// }

// // Función para calcular rating (existente)
// function calcularRating(element, $) {
//     const ratingsContainer = $(element).find('[class*="ratings--container"]').first();
//     if (!ratingsContainer.length) return null;

//     let rating = 0;
//     let estrellaCount = 0;

//     const estrellas = ratingsContainer.find('i[class*="cs-icon-star"]');

//     estrellas.each((i, estrella) => {
//         const clases = $(estrella).attr('class') || '';

//         if (clases.includes('cs-icon-star-filled')) {
//             rating += 1;
//             estrellaCount++;
//         } else if (clases.includes('cs-icon-star-half_filled')) {
//             rating += 0.5;
//             estrellaCount++;
//         } else if (clases.includes('cs-icon-star-empty')) {
//             estrellaCount++;
//         }
//     });

//     if (estrellaCount > 0) {
//         return parseFloat((rating / estrellaCount * 5).toFixed(1));
//     }

//     return null;
// }

// function mejorarCalidadImagen(url) {
//     if (!url) return null;
//     if (url.includes('data:image/svg')) return null;

//     return url
//         .replace('/w=200,', '/w=800,')
//         .replace(',h=200,', ',h=800,')
//         .replace('q=85', 'q=90');
// }

// app.get('/api/scrape', async (req, res) => {
//     const searchTerm = req.query.q || 'cemento argos';
//     const url = `https://www.homecenter.com.co/homecenter-co/search/?Ntt=${encodeURIComponent(searchTerm)}`;

//     console.log(`Scrapeando URL: ${url}`);

//     try {
//         const response = await axios.get(url, {
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
//                 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
//                 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
//             }
//         });

//         const $ = cheerio.load(response.data);

//         // INTENTAR PRIMERO: Extraer datos de JSON-LD
//         const datosJSON = extraerJSONLD($);
//         let productos = buscarProductosEnJSON(datosJSON);

//         console.log(`Encontrados ${productos.length} productos en JSON-LD`);

//         // Si no encontramos productos en JSON, usar scraping HTML
//         if (productos.length === 0) {
//             console.log('No se encontraron productos en JSON, usando scraping HTML...');

//             $('[class*="product-wrapper"]').each((index, element) => {
//                 const producto = scrapearHTML($, element);
//                 if (producto.nombre || producto.id) {
//                     productos.push(producto);
//                 }
//             });
//         } else {
//             // Si encontramos productos en JSON, intentar enriquecer con datos del HTML
//             // (como la unidad de medida que puede no estar en JSON)
//             $('[class*="product-wrapper"]').each((index, element) => {
//                 const id = $(element).attr('data-key');
//                 if (id) {
//                     const productoJSON = productos.find(p => p.id === id);
//                     if (productoJSON) {
//                         // Extraer unidad del HTML si no está en JSON
//                         if (!productoJSON.unidad) {
//                             const unitElement = $(element).find('span[class*="price-unit"]').first();
//                             productoJSON.unidad = unitElement.text().trim() || null;
//                         }

//                         // Extraer imagen de alta calidad si no está en JSON
//                         if (!productoJSON.imagen_url || productoJSON.imagen_url.includes('data:image')) {
//                             let imagenUrl = null;
//                             const imgWithId = $(element).find(`img[id="${id}"]`).first();
//                             if (imgWithId.length) {
//                                 imagenUrl = imgWithId.attr('src') || imgWithId.attr('data-src');
//                                 productoJSON.imagen_url = mejorarCalidadImagen(imagenUrl);
//                             }
//                         }
//                     }
//                 }
//             });
//         }

//         res.json({
//             success: true,
//             count: productos.length,
//             searchTerm: searchTerm,
//             fuente: productos.length > 0 && datosJSON.length > 0 ? 'json+html' : 'html',
//             data: productos
//         });

//     } catch (error) {
//         console.error('Error:', error.message);
//         res.status(500).json({
//             success: false,
//             error: 'Error al obtener los datos',
//             details: error.message
//         });
//     }
// });

// app.listen(PORT, () => {
//     console.log(`Servidor corriendo en http://localhost:${PORT}`);
// });
