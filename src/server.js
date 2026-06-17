const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");

const env = require("./config/envConfig");
const { connectMongoose } = require("./config/db");
const app = require("./app");
const logger = require("./utills/logger");

connectMongoose()
  .then(() => {
    app.listen(env.PORT, async () => {
      logger.info(`Server started on port ${env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("REAL ERROR >>>", err);
    logger.error("Startup error", { err });
    process.exit(1);
  });

// router /login ---- > controller ----> email and password -----> token generate(id, email)
// create customer  router.post('/create', verfiytoken, createCustomer)
// verifyToken ---- > token ----------> decode --------> id fetch -----------> if find ---------> next
