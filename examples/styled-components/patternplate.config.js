module.exports = {
  docs: ["docs/**/*.md", "*.md"],
  entry: ["lib/**/demo.js"],
  render: "@patternplate/render-styled-components/render",
  mount: "@patternplate/render-styled-components/mount"
};
