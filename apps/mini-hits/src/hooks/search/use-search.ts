import { useQuery } from "../api/graphql";
import { useDebounce } from "./use-debounce";

export interface SearchProps {
  searchPhrase: string;
  token?: string;
}
export function useSearch({ searchPhrase, token }: SearchProps) {
  const debouncedPhrase = useDebounce(searchPhrase, "", 400);

  const {
    data: searchData,
    loading: searchLoading,
    errors: searchError,
  } = useQuery<SearchOutput>(token ?? "", {
    query: SEARCH_QUERY,
    variables: {
      args: {
        query: debouncedPhrase,
        filters: {},
      },
    },
    skip: !token?.length || !debouncedPhrase.length,
  });

  return {
    searchData,
    searchLoading,
    searchError,
  };
}

export const SEARCH_QUERY = `query Search($args: SearchArgs!) {
  search(args: $args) {
    organicResults {
      id
      entityType
      title
      children {
        id
        entityType
        title
      }
    }
  }
}`;

export interface SearchOutput {
  search: {
    organicResults: {
      id: number;
      entityType: number;
      title: string;
      children: {
        id: number;
        title: string;
        entityType: number;
      }[];
    }[];
  };
}
