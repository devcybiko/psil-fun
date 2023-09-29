function psilify(list) {
    let json = JSON.stringify(list);
    let code = json.replaceAll('"', "`").replaceAll("[", "(").replaceAll("]", ")").replaceAll(",", " ");
    return code;
}

module.exports = { psilify }