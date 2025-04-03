export function EmptyMessage(props: { searchTerm: string }) {
  return <p>Nothing found with “{props.searchTerm}”. Please try a different search term.</p>;
}
