const { db, admin } = require("../config/firebase");

async function pushNotification(data) {
  try {
    const deviceDoc = await db.collection("devices").doc("admin_device").get();
    const fcmToken = deviceDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log("No hay un token FCM registrado para este dispositivo.");
      return;
    }

    // 3. Construir la notificación usando las propiedades de tu objeto 'data'
    const payload = {
      token: fcmToken,
      notification: {
        title: `Nuevo: ${data.service}`, // Ejemplo: "Nuevo: reparaciones"
        body: `${data.name} dice: ${data.message.substring(0, 60)}...`, // Muestra un fragmento del mensaje
      },
      // Datos extra en segundo plano para que Flutter los use si necesitas abrir una pantalla específica
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        client_name: data.name,
        client_phone: data.phone,
        client_email: data.email,
        service_type: data.service,
        type: "lead_contact",
      },
    };

    // 4. Enviar el disparo a FCM
    const response = await admin.messaging().send(payload);
    console.log("Notificación enviada con éxito. ID:", response);
  } catch (error) {
    console.error("Error al procesar la notificación push:", error);
  }
}

module.exports = { pushNotification };