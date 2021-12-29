module.exports = {
  "presets": [
    ["@babel/env", {
      "loose": true,
      "modules": false
    }]
  ],
  "plugins": [
    //"@babel/plugin-transform-runtime"
  ],
  "ignore": [
    "dist/*.js"
  ],
  "comments": false
};
