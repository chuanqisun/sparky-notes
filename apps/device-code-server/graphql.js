const axios = require("axios");

const SEARCH = `query Search($args: SearchArgs!) {
  search(args: $args) {
    organicResults {
      id
      title
    }
  }
}`;

async function search({ phrase, token }) {
  const graphResponse = await axios({
    method: "post",
    url: `https://hits.microsoft.com/graphql`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "hits-api-base-url": "https://msfthitsapi.azurewebsites.net/api/",
      "hits-api-authorization": `Bearer ${token}`,
    },
    data: JSON.stringify({
      query: SEARCH,
      variables: {
        args: {
          query: phrase,
          filters: {},
        },
      },
    }),
  });

  return graphResponse.data;
}

module.exports = {
  search,
};
