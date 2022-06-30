const http = require("http");
const fs = require("fs");
const url = require("url");
const path = require("path");

http
  .createServer((req, res) => {
    const r = url.parse(req.url);
    if (r.path === "/") {
      fs.createReadStream(path.join(__dirname, "../index.html")).pipe(res);
    }
    if (r.pathname === "/bills") {
      const query = queryString(r.query || "");
      const month = query.month;
      Promise.all([readCsvFile("bill"), readCsvFile("categories")]).then(
        (response) => {
          const [billJson = [], categoriesJson = []] = response;
          res.writeHead(200, { "Content-Type": "application/json" });
          const data = billJson.map((item) => ({
            ...item,
            time: new Date(Number(item.time)),
            category: categoriesJson.find((c) => c.id === item.category).name,
          }));
          let results = data;
          if (month) {
            results = data.filter((item) => {
              return item.time.getMonth() + 1 == month;
            });
          }
          res.write(
            JSON.stringify({
              total: calculateAmount(results),
              data: results,
            })
          );
          res.end();
        }
      );
    }
  })
  .listen(3000);

const readCsvFile = (name) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(__dirname, `../${name}.csv`), "utf8", (err, data) => {
      if (err) {
        reject(err);
      }
      list = data.split("\n");
      const keys = list.shift().split(",");
      const json = list.map((item) => {
        const values = item.split(",");
        return keys.reduce((p, n, i) => {
          p[n] = values[i];
          return p;
        }, {});
      });
      resolve(json);
    });
  });
};

const queryString = (query = "") => {
  return (
    query.split("&").reduce((p, n) => {
      const [key, value] = n.split("=");
      p[key] = value;
      return p;
    }, {}) || {}
  );
};

const calculateAmount = (list) => {
  return list.reduce(
    (total, item) => {
      const { type, amount } = item;
      if (Number(type) === 1) {
        total.income += Number(amount);
      } else {
        total.outcome += Number(amount);
      }
      return total;
    },
    {
      income: 0,
      outcome: 0,
    }
  );
};
