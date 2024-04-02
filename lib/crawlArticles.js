// TKTK Implement getting all article references from a laws overview page
// https://www.gesetze-im-internet.de/kaeaano/index.html
export default async function (law) {
  return {
    law,
    paragraphs: ["1"],
  };
}
