export const createStreamingTrimmer = () => {
    let seen = '';
    return (next: string) => {
        if (!seen.length) {
            seen += next.trim();
        }
        return seen.length ? next : next.trim();
    };
};
