// load environmental variables
import dotenv from "dotenv";
dotenv.config();

// require("dotenv").config();

const config = {
  development: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    logging: false,
  },
  test: {
    use_env_variable: "DATABASE_TEST_URL",
    dialect: "postgres",
    logging: false,
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    logging: false,
  },
};

export default config;
