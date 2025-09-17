export const equalsIgnoreCase = (a: string, b: string) => {
    if (!a || !b) {
        return false;
    }
    return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}