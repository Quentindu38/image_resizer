window.onload = () =>{
  const uploadImagesForm = document.querySelector("#uploadImagesForm");
  const uploadImagesBtn = document.querySelector("#uploadImagesBtn");

  uploadImagesBtn.addEventListener("click", (event) => {
    event.preventDefault();
    const formData = new FormData(uploadImagesForm);


    fetch('/upload', {
      method: "POST",
      body: formData,
    }).then(data => {
      console.log(data);
    }).catch(err => {
      console.error(err);
    })

  });

}