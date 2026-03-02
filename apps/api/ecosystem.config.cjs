module.exports = {
  apps: [{
    name: "api-geocampus",
    script: "./src/start.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 4000
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 4000,
      DB_HOST: "172.19.82.207"
    }
  }]
}