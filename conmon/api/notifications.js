const { db, admin } = require("../config/firebase");

async function pushNotification(data) {
  try {
    const deviceDoc = await db.collection("devices").doc("admin_device").get();
    const fcmToken = deviceDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log("No hay un token FCM registrado para este dispositivo.");
      return;
    }
    //formato de notificaciones:
  //     AppNotification({
  //   required super.createdAt,
  //   required this.title,
  //   required this.body,
  //   this.payload,
  //   required this.date,
  //   required this.type,
  //   this.read = false,
  // });
  
    // 3. Construir la notificación usando las propiedades de tu objeto 'data'
    const payload = {
      token: fcmToken,
      notification: {
        title: data.title, // Ejemplo: "Nuevo: reparaciones"
        body: data.body, // Muestra un fragmento del mensaje
      },
      // Datos extra en segundo plano para que Flutter los use si necesitas abrir una pantalla específica
      // data: {
      //   click_action: "FLUTTER_NOTIFICATION_CLICK",
      //   ...data.payload,
      //   type: data.type,
      // },
    };

    // 4. Enviar el disparo a FCM
    const response = await admin.messaging().send(payload);
    console.log("Notificación enviada con éxito. ID:", response);
  } catch (error) {
    console.error("Error al procesar la notificación push:", error);
  }
}

module.exports = { pushNotification };