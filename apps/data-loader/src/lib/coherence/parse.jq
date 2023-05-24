{
  "pivots": [
    .article.pivots[] | {
      "pivotTitle": .title,
      "sections": [
        .sections[] | {
          "sectionTitle": .title
        }
      ]
    }
  ]
}