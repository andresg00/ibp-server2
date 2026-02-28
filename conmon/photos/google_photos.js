// const puppeteer = require("puppeteer");
// const axios = require("axios");
// const cheerio = require("cheerio");

// const regex =
//   /\["(https:\/\/lh3\.googleusercontent\.com\/pw\/[a-zA-Z0-9\-_]*)"/g;

// function extractPhotos(content) {
//   const links = new Set();
//   let match;
//   while ((match = regex.exec(content))) {
//     links.add(match[1]);
//   }
//   return Array.from(links);
// }

// async function getAlbum(id) {
//   const response = await axios.get(`https://photos.app.goo.gl/${id}`);
//   return extractPhotos(response.data);
// }

// // async function getAlbumDetails(albumId) {
// //   const browser = await puppeteer.launch({ headless: true });
// //   const page = await browser.newPage();

// //   await page.goto(`https://photos.app.goo.gl/${albumId}`, {
// //     waitUntil: "networkidle2",
// //   });

// //   // Extraer el nombre del álbum
// //   const albumTitle = await page.evaluate(() => {
// //     return document.title.replace(" - Google Fotos", "") || "Sin título";
// //   });

// //   // Extraer datos con JavaScript ejecutado en el navegador
// //   const images = await page.evaluate(() => {
// //     return Array.from(document.querySelectorAll("a.p137Zd")).map((el) => {
// //       return {
// //         pageUrl: "https://photos.app.goo.gl" + el.getAttribute("href"),
// //         imageId: el.getAttribute("href").match(/\/photo\/([^?]+)\?/)[1],
// //         imageUrl: el
// //           .querySelector("div.RY3tic")
// //           ?.style?.backgroundImage.match(
// //             /url\(&quot;(https:\/\/lh3\.googleusercontent\.com\/pw\/[^&]+)/
// //           )?.[1],
// //         date: el.getAttribute("aria-label"),
// //       };
// //     });
// //   });

// //   await browser.close();
// //   return { albumTitle, images };
// // }

// // Prueba con un álbum real
// // getAlbumDetails("ALBUM_ID_AQUI").then(console.log);

// async function getAlbumDetails(albumId) {
//   try {
//     const response = await axios.get(`https://photos.app.goo.gl/${albumId}`);
//     extractPhotos(response.data);
//     const html = response.data;
//     const $ = cheerio.load(html);

//     // Extraer el nombre del álbum
//     const albumTitle =
//       $("title").text().replace(" - Google Fotos", "") || "Sin título";

//     let images = [];

//     $("a.p137Zd").each((_, element) => {
//       element.attributes.toString();
//       const pageUrl = "https://photos.app.goo.gl" + $(element).attr("href");
//       const idMatch = pageUrl.match(/\/photo\/([^?]+)\?/);
//       const imageId = idMatch ? idMatch[1] : null;

//       const metadataText = $(element).attr("aria-label");
//       let date = "Desconocida";
//       if (metadataText) {
//         const matchDate = metadataText.match(
//           /([0-9]{1,2} \w{3,} [0-9]{4}), ([0-9]{1,2}:[0-9]{2})/
//         );
//         if (matchDate) {
//           date = `${matchDate[1]}, ${matchDate[2]}`;
//         }
//       }

//       // Extraer URL de la imagen
//       const imgDiv = $(element).find("div.RY3tic");
//       const style = imgDiv.attr("style") || "";
//       const urlMatch = style.match(
//         /url\(&quot;(https:\/\/lh3\.googleusercontent\.com\/pw\/[^&]+)/
//       );
//       const imageUrl = urlMatch ? urlMatch[1] : null;

//       images.push({
//         imageId,
//         pageUrl,
//         imageUrl,
//         date,
//       });
//     });

//     return { albumTitle, images };
//   } catch (error) {
//     console.error("Error obteniendo datos:", error);
//     return null;
//   }
// }
// module.exports = { getAlbumDetails };
