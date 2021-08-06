window.onload = () =>{
  const uploadImagesForm = document.querySelector("#uploadImagesForm");
  const imagesToUploadInput = document.querySelector("#imagesToUploadInput");
  const skuInput = document.querySelector("#skuInput");
  const topCategoryInput = document.querySelector("#topCategoryInput");
  const uploadImagesBtn = document.querySelector("#uploadImagesBtn");
  const previewSection = document.querySelector("#previewSection");

  uploadImagesBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const formData = new FormData(uploadImagesForm);

    if(imagesToUploadInput.files.length == 0) {
      Swal.fire(
        'Data not provided',
        'Please select at least one image to upload',
        'error'
      );
      return;
    }

    if(!formData.get('coverImage')) {
      Swal.fire(
        'Data not provided',
        'Please set an image as the cover image',
        'error'
      );
      return;
    }

    if(skuInput.value == "") {
      Swal.fire(
        'Data not provided',
        'Please enter the top category name - It\'s needed to upload images to the right folder',
        'error'
      );
      return;
    }
    if(topCategoryInput.value == "") {
      Swal.fire(
        'Data not provided',
        'Please enter the sku name - It\'s needed to upload images to the right folder',
        'error'
      );
      return;
    }


    fetch('/upload', {
      method: "POST",
      body: formData,
    }).then(data => {

      if(data.status != 200) {
        throw new Error("An error occurs - please try again");
      }

      Swal.fire(
        'Youupi. Uploaded',
        'Images have been uploaded to the server successfully',
        'success',

      ).then(() => {
        imagesToUploadInput.value = null;
        topCategoryInput.value = null;
        skuInput.value = null;
        previewSection.innerHTML = "";
      });
    }).catch(err => {
      Swal.fire(
        'An error occurs',
        err.message,
        'success'
      );
    })

  });

  imagesToUploadInput.addEventListener("change", (event) => {

    const filesCount = imagesToUploadInput.files.length;
    previewSection.innerHTML = "";
    for(let i=0; i<filesCount; i++) {
      const file = imagesToUploadInput.files[i];
      const tmpPath = URL.createObjectURL(file);

      if(/image/.test(file.type) == false) {
        Swal.fire(
          'Invalid file',
          `${file.name} is not a valid image file`,
          'error'
        );
        uploadImagesBtn.setAttribute("disabled", true);
        return;
      }

      const previewContainer = document.createElement("div");
      previewContainer.classList = "col-lg-3 col-sm-6 col-12"

      const previewCard = document.createElement("div");
      previewCard.classList = "m-1 card";

      const imageElement = new Image();
      imageElement.src = tmpPath;
      imageElement.classList = "card-img-top"

      const previewCardBody = document.createElement('div');
      previewCardBody.className = "card-body";

      const coverInputContainer = document.createElement('div');
      coverInputContainer.className = "input-group";

      const coverInputLabel = document.createElement('label');
      coverInputLabel.innerText = "Set as cover image";
      coverInputLabel.setAttribute("for", file.name);

      const coverInputFieldContainer = document.createElement('div');
      coverInputContainer.className = "input-group-text";

      const coverInput = document.createElement('input');
      coverInput.type = 'radio';
      coverInput.name = 'coverImage';
      coverInput.value = file.name;
      coverInput.id = file.name;

      imageElement.addEventListener('click', (event) => {
        event.currentTarget.nextSibling.children[0].children[0].checked = true;
      });


      coverInputFieldContainer.appendChild(coverInput)
      coverInputContainer.appendChild(coverInputFieldContainer);
      coverInputContainer.appendChild(coverInputLabel);

      previewCard.appendChild(imageElement);
      previewCard.appendChild(coverInputContainer);
      previewContainer.appendChild(previewCard);
      previewSection.appendChild(previewContainer);
      uploadImagesBtn.removeAttribute("disabled");
    }
  });

}