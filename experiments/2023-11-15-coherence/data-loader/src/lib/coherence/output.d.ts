interface Result {
  pivots: {
    pivotTitle: "Overview" | "Usage" | "Code" | "Examples";
    sections: {
      sectionTitle: string;
    }[];
  }[];
}
