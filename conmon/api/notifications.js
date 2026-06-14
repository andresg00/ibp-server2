const { db, admin } = require("../config/firebase");

async function pushNotification(data) {
  try {
    const devices = await db.collection("devices").get();
    //iterar la lista y verifiacr el rol de cada dispositivo
    for (const device of devices.docs) {
      const fcmToken = device.id;
      const role = device.data()?.role;
      if (role !== 'admin') {
        console.log("El dispositivo no es un admin.");
        continue;
      } else {
        // 3. Construir la notificación usando las propiedades de tu objeto 'data'
        const payload = {
          token: fcmToken,
          notification: {
            title: data.title, // Ejemplo: "Nuevo: reparaciones"
            body: data.body, // Muestra un fragmento del mensaje
          },
        };

        // 4. Enviar el disparo a FCM
        const response = await admin.messaging().send(payload);
        console.log("Notificación enviada con éxito. ID:", response);
      }
    }


  } catch (error) {
    console.error("Error al procesar la notificación push:", error);
  }
}

module.exports = { pushNotification };