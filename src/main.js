import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { MatcapShader } from './MatcapShader.js'

function createMeshPhongMaterial()
{
    const material = new THREE.MeshPhongMaterial();
    material.shininess = 100;
    material.specular = new THREE.Color(0x1188ff);
    return material;
}

function createMatcapMaterial(image)
{
    console.log( 'load image: %s', image );
    const matcapTexture = new THREE.TextureLoader().load(image);
    const material = new THREE.ShaderMaterial(MatcapShader);
    material.uniforms.matcap.value = matcapTexture;

    return material;
}

// サイズを指定
const width = 1482;
const height = 920;

// レンダラーを作成
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#myCanvas"),
    //alpha: true,
    antialias: true
});
renderer.setSize(width, height);

// シーンを作成
const scene = new THREE.Scene();

// カメラを作成
// new THREE.PerspectiveCamera(視野角, アスペクト比, near, far)
const camera = new THREE.PerspectiveCamera(45, width / height, 0.0001, 1000);
// 焦点距離設定
camera.setFocalLength(50);
camera.position.set(0, 0, +5);
// カメラコントローラーを作成
const controls = new OrbitControls(camera, document.body);
// 滑らかにカメラコントローラーを制御する
controls.enableDamping = true;
controls.dampingFactor = 0.2;


const material = createMatcapMaterial("../texture/matcap3.png");

const fbxLoader = new FBXLoader()
fbxLoader.load(
    '../model/Luna.fbx',
    (object) => {
        object.traverse( (child) => {
            if( child.isMesh ){
                child.material = material;
                if( child.material ){
                    child.material.transparent = false;
                }
            }
        });
        object.scale.set(1, 1, 1);
        scene.add(object);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.log(error);
    }
)

// 平行光源
//const directionalLight = new THREE.DirectionalLight(0xffffff);
//directionalLight.position.set(1, 1, 1);
// 環境光源
//const ambientLight = new THREE.AmbientLight(null, 0.3);
// シーンに追加
//scene.add(directionalLight);
//scene.add(ambientLight);

tick();

// 毎フレーム時に実行されるループイベント
function tick() {
    // カメラコントローラーを更新
    controls.update();

    // レンダリング
    renderer.render(scene, camera);

    requestAnimationFrame(tick);
}