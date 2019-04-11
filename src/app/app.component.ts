import { Component, AfterViewInit, OnInit, ViewChild, ElementRef } from '@angular/core';

import * as canvas from 'canvas';

import * as faceapi from 'face-api.js';

// const { Canvas, Image, ImageData } = canvas;
//Illegal constructor fix
faceapi.env.monkeyPatch({
  Canvas: HTMLCanvasElement,
  Image: HTMLImageElement,
  ImageData: ImageData,
  Video: HTMLVideoElement,
  createCanvasElement: () => document.createElement('canvas'),
  createImageElement: () => document.createElement('img')
});
// faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
const MODEL_URL = './models/';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnInit {
  title = 'faceDetector';
  @ViewChild("videoElement") videoElement: ElementRef;
  @ViewChild("canvasElement") canvasElement: ElementRef;
  @ViewChild("overlayElement") overlayElement: ElementRef;
  isModelLoaded: boolean = false;
  faceDescriptors: any;
  labeledDescriptors: any = [];
  faceMatcher: any;
  hasGetUserMedia() {
    return (navigator.getUserMedia || (<any>navigator).webkitGetUserMedia || (<any>navigator).mozGetUserMedia || (<any>navigator).msGetUserMedia);
  }
  async ngOnInit() {
    let proxy = this;
    let resultEle = document.getElementById("result");
    await faceapi.loadSsdMobilenetv1Model(MODEL_URL).then((res) => {
      resultEle.innerHTML = "SSD MobileNet Face detector model loaded successfully";
    }).catch(err => {
      console.log("face detector error: ", err);
    });
    // await faceapi.loadTinyFaceDetectorModel(MODEL_URL).then((res) => {
    //   resultEle.innerHTML = "Tiny Face detector model loaded successfully";
    // }).catch(err => {
    //   console.log("face detector error: ", err);
    // });
    await faceapi.loadFaceLandmarkModel(MODEL_URL).then(res => {
      resultEle.innerHTML = "Face landMark Model loaded successfully";
    });
    // await faceapi.loadFaceLandmarkTinyModel(MODEL_URL).then(res => {
    //   resultEle.innerHTML = " Tiny Face landMark Model loaded successfully";
    // });
    await faceapi.loadFaceRecognitionModel(MODEL_URL).then(res => {
      resultEle.innerHTML = "Face Recognition Model loaded successfully";
      proxy.detectFace();
    });
  }
  async ngAfterViewInit() {
    let videoElement: HTMLVideoElement = this.videoElement.nativeElement;
    let canvas = (<any>this.canvasElement).nativeElement;
    let ctx: CanvasRenderingContext2D = (<HTMLCanvasElement>canvas).getContext("2d");
    let proxy = this;
    (<any>navigator).getMedia = this.hasGetUserMedia();
    (<any>navigator).getMedia({ video: true, audio: false }, function (stream) {
      videoElement.srcObject = stream;
      videoElement.play();
    }, function (err) {
      //Error Occured
      console.log("Error Occured: ", err.code);
    });
    videoElement.addEventListener("play", function () {
      proxy.draw(this, ctx, 300, 450);
    }, false);
  }
  draw(video, context, width, height) {
    let proxy = this;
    context.drawImage(video, 0, 0, width, height);
    requestAnimationFrame(function () {
      proxy.draw(video, context, width, height);
    });
  }
  async detectFace() {
    let canvas = (<any>this.canvasElement).nativeElement;
    let overlay = (<any>this.overlayElement).nativeElement;
    let context = overlay.getContext('2d');
    context.clearRect(0, 0, overlay.width, overlay.height);
    // this.faceDescriptors = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.6 })).withFaceLandmarks().withFaceDescriptor();
    this.faceDescriptors = await faceapi.detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.8 })).withFaceLandmarks().withFaceDescriptor();
    console.log(this.faceDescriptors);
    this.identify();
  }
  async addFace() {
    let resultEle = document.getElementById("result");
    var name = (<HTMLInputElement>document.getElementById("name")).value;
    var isRepeatedValue = false;
    if (this.faceDescriptors && this.faceDescriptors.descriptor) {
      this.labeledDescriptors.forEach((cd) => {
        if (cd.label.toLowerCase() == name.toLocaleLowerCase()) {
          cd.descriptors.push(this.faceDescriptors.descriptor);
          isRepeatedValue = true;
        }
      });
      if (!isRepeatedValue) {
        let currentDescriptor =
          await new faceapi.LabeledFaceDescriptors(
            name,
            [this.faceDescriptors.descriptor]
          );
        this.labeledDescriptors.push(currentDescriptor);
      }
      debugger
      this.faceMatcher = await new faceapi.FaceMatcher(this.labeledDescriptors);
      resultEle.innerHTML = "New Face added as " + name + "!!!";
    } else {
      resultEle.innerHTML = "Retake the samples!!!";
    }
  }
  async identify() {
    let resultEle = document.getElementById("result");
    if (this.faceMatcher && this.faceDescriptors) {
      let bestMatch: any = this.faceMatcher.findBestMatch(this.faceDescriptors.descriptor);
      if (bestMatch._label.toLowerCase() == "unknown") {
        resultEle.innerHTML = "Face Detected!!!"
      } else {
        resultEle.innerHTML = "Hi " + bestMatch.label + " Distance: " + bestMatch.distance;
      }
    } else {
      resultEle.innerHTML = "Face Detected!!!"
    }
  }
}
