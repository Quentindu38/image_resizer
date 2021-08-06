window.onload = () => {
  const previewResizedSection = document.querySelector(
    "#previewResizedSection"
  );
  const sendResizeCmdBtn = document.querySelector("#sendResizeCmdBtn");
  const previewSection = document.querySelector("#previewSection");
  const changeCatalogFolderCmdBtn = document.querySelector(
    "#changeCatalogFolderCmdBtn"
  );
  const catalogFolder = document.querySelector("#catalogFolder");

  getImages("/catalog", previewSection);
  getImages("/catalog/resized", previewResizedSection);

  sendResizeCmdBtn.addEventListener("click", (event) => {
    event.preventDefault();

    fetch("/catalog/resizeAll", {
      method: "GET",
    })
      .then((data) => {
        if (data.status != 200) {
          throw new Error("An error occurs - please try again");
        }

        Swal.fire(
          "Youupi. Uploaded",
          "Images have been resized successfully",
          "success"
        );

        getImages("/catalog/resized", previewResizedSection);
      })
      .catch((err) => {
        Swal.fire("An error occurs", err.message, "success");
      });
  });

  changeCatalogFolderCmdBtn.addEventListener("click", (event) => {
    event.preventDefault();

    if (catalogFolder.value == "") {
      Swal.fire(
        "No folder set",
        "Please set a folder string before continue",
        "error"
      );
      return;
    }

    const data = { catalogFolder: catalogFolder.value };
    console.log(data);
    fetch("/catalog/catalogFolder", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    })
      .then((data) => {
        Swal.fire("Cool :)", "Folder changed successfully", "success").then(
          () => {
            getImages("/catalog", previewSection);
            getImages("/catalog/resized", previewResizedSection);
          }
        );
      })
      .catch((error) => {
        console.log(error);
        Swal.fire("Error :(", error.message, "error");
      });
  });

  function getImages(url, containerPane) {
    containerPane.innerHTML = "";
    fetch(url).then(async (data) => {
      const catalog = await data.json();
      for (let topCategory in catalog) {
        const topCategoryTitle = topCategory;
        topCategory = catalog[topCategory];
        for (let sku in topCategory) {
          const skuTitle = sku;
          sku = topCategory[sku];
          for (let color in sku) {
            const title = document.createElement("h6");
            const colorTitle = color;
            title.innerText = `${topCategoryTitle}/${skuTitle}/${colorTitle}`;
            containerPane.appendChild(title);
            color = sku[color];
            const container = document.createElement("div");
            container.classList = "row m-0";
            containerPane.appendChild(container);
            for (let url of color) {
              showPreview(url, container);
            }
          }
        }
      }
    });
  }

  function showPreview(url, container) {
    const previewContainer = document.createElement("div");
    previewContainer.classList = "col-lg-3 col-sm-6 col-12";

    const previewCard = document.createElement("div");
    previewCard.classList = "m-1 card";

    const imageElement = new Image();
    imageElement.src = url;
    imageElement.classList = "card-img-top";

    const previewCardBody = document.createElement("div");
    previewCardBody.className = "card-body";

    previewCard.appendChild(imageElement);
    previewContainer.appendChild(previewCard);
    container.appendChild(previewContainer);
  }
};
