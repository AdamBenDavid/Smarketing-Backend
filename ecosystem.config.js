module.exports = {
  apps : [{
    name   : "app1",
    script : "node dist/app.js",
    env_production: {
      NODE_ENV: "production"
    }
  }]
}
