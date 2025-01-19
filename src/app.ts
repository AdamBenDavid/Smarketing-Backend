//adam ben david 208298257
//aviv menahem 212292197

import { initApp, server } from "./server";
const port = process.env.PORT;

initApp().then(() => {
  server.listen(port, () => {
    console.log(`server is running on port ${port}`);
  });
});