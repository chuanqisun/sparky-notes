Observed performance issue when indexing individual claims using flexsearch. The indexer slows down significantly when indexing the content of collections.

26 seconds for claim level index rebuild vs. 10 seconds for report level rebuild

In addition, indexing resued claims causes ID collision, which significantly impacts performance
