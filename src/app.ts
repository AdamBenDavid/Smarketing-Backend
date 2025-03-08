//adam ben david 208298257
//aviv menahem 212292197

import initApp from "./server";
import { httpServer } from "./server";
const port = process.env.PORT;

initApp().then(() => {
  httpServer.listen(port, () => {
    console.log(`server is running on port ${port}`);
  });
});