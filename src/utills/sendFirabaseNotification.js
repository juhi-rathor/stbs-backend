const admin = require("../config/firebase");

// ---- UTILITY: CLEAN DATA PAYLOAD ---- //
const cleanDataForFCM = (data = {}) => {
  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    cleaned[key] =
      typeof value === "object" ? JSON.stringify(value) : String(value);
  }
  return cleaned;
};

// ---- MAIN FUNCTION ---- //
/**
 * Send notification to a single device token.
 *
 * @param {string} deviceToken - The user's FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification message
 * @param {object} [data={}] - Optional data payload
 * @param {string} [imageUrl=''] - Optional image URL
 */
const sendFirebaseNotification = async (
  deviceToken,
  title,
  body,
  data = {},
  imageUrl = ""
) => {
  try {
    if (!deviceToken) {
      console.log(" Notification skipped: No device token.");
      return { success: true, skipped: true };
    }

    if (!title || !body) throw new Error("Title and body are required");

    // Notification payload
    const message = {
      token: deviceToken,
      notification: {
        title,
        body,
        image:
          imageUrl ||
          "https://media.istockphoto.com/id/1183183791/photo/talented-female-artist-works-on-abstract-oil-painting.jpg?s=2048x2048&w=is&k=20&c=dJJrGrY-BS5Flffk3JEBPKEhw5kR_fRoIbYsgiINKeQ=", // ✅ default image
      },
      data: cleanDataForFCM(data),

      // Android push config
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },

      // iOS push config
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
          },
        },
      },

      // Web push config
      webpush: {
        notification: {
          title,
          body,
          icon: "https://yourapp.com/logo192.png",
          image:
            imageUrl ||
            "https://media.istockphoto.com/id/1183183791/photo/talented-female-artist-works-on-abstract-oil-painting.jpg?s=2048x2048&w=is&k=20&c=dJJrGrY-BS5Flffk3JEBPKEhw5kR_fRoIbYsgiINKeQ=",
        },
      },
    };

    // Send notification
    const response = await admin.messaging().send(message);

    console.log("✅ Notification sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("❌ Error sending FCM notification:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    };
  }
};

module.exports = sendFirebaseNotification;
