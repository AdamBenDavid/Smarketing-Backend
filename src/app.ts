//adam ben david 208298257
//aviv menahem 212292197

import initApp from "./server";
import { app, httpServer } from "./server";
import express from "express";
import path from 'path';
import https from 'https';
import fs from 'fs';
import { initializeSocket } from "./socket";

initApp()
  .then((app) => {
    const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === 'production';
    console.log(`🔑  isProduction: ${isProduction}`);
    
    let server;
    
    if (isProduction) {
      const httpsOptions = {
        key: fs.readFileSync('/home/st111/client-key.pem'),
        cert: fs.readFileSync('/home/st111/client-cert.pem')
      };
      server = https.createServer(httpsOptions, app);
      // Initialize socket.io with HTTPS server in production
      initializeSocket(server);
    } else {
      server = httpServer;
    }

    app.use(express.static(path.join(__dirname, "../../Smarketing-Client/dist")));
    

    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../../Smarketing-Client/dist/index.html"));
    });


    
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`✅  Server listening on port ${port}`);
      console.log(`Mode: ${process.env.NODE_ENV}`);
      console.log(`Base URL: ${process.env.BASE_URL}`);
    });
  })
  .catch((error) => {
    process.exit(1);
  });