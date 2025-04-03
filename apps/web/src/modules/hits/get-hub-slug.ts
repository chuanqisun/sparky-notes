/**
 * ported from https://dev.azure.com/microsoft/HITS%20Team/_git/HITS?path=%2FMicrosoft.Osg.Urt.UI%2FScripts%2Futils.js&version=GBmaster&line=2939&lineEnd=2939&lineStartColumn=1&lineEndColumn=47
 * the logic should also be equivalent to our DB function: https://dev.azure.com/microsoft/HITS%20Team/_git/HITS?path=%2FMicrosoft.Osg.Urt.Database%2FFunctions%2FRemoveAllSpecialCharacters.sql
 *
 * see Graphql repo `graphql/utils/get-hub-slug.ts`
 */
export function getHubSlug(hubName: string) {
  return hubName
    .replace(/&/g, "And")
    .replace(/ /g, "-")
    .replace(/[^a-zA-Z0-9-%]/g, "")
    .toLocaleLowerCase();
}
