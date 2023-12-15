import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { MatcapShader } from './MatcapShader.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// 定数定義
// サイズを指定
const width = 1440;
const height = 900;
const BOUNDING_BOX_FRAME_NAME = "BoundingBoxFrame"

// 変数定義
var model = null;
var modelBoundingBox = null;
var scene = null;

function createMeshPhongMaterial()
{
    const material = new THREE.MeshPhongMaterial();
    material.shininess = 100;
    material.specular = new THREE.Color(0x1188ff);
    return material;
}

function createMatcapMaterial(image_file_path)
{
    console.log( 'load image: %s', image_file_path );
    const matcapTexture = new THREE.TextureLoader().load(image_file_path);
    const material = new THREE.ShaderMaterial(MatcapShader);
    material.uniforms.matcap.value = matcapTexture;

    return material;
}

function getBoundingBox(mesh)
{
    mesh.geometry.computeBoundingBox();
    return mesh.geometry.boundingBox;
}

function setupGUI()
{
    const gui = new GUI();

    var obj = {
        FileName : 'lil-gui',
        ShowBoundingBox : true
    };

    gui.add( obj, 'FileName' );
    gui.add( obj, 'ShowBoundingBox' ).onChange( (value) => {
        var bb = null;
        scene.traverse( (child) => {
            if( child.name == BOUNDING_BOX_FRAME_NAME ){
                bb = child;
            }
        })

        if( bb != null ){
            bb.visible = value;
        }
    });

    return gui;
}

function calculateBoundingBoxFitAllMesh(bbox)
{
    var min = new THREE.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var max = new THREE.Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE); 
    bbox.forEach( (box) => {
        min.x = Math.min(box.min.x, min.x);
        min.y = Math.min(box.min.y, min.y);
        min.z = Math.min(box.min.z, min.z);
        max.x = Math.max(box.max.x, max.x);
        max.y = Math.max(box.max.y, max.y);
        max.z = Math.max(box.max.z, max.z);
    });

    return new THREE.Box3().set(min, max);
}

function calculateCameraPosToFitModel(camera, model_bbox)
{
    // モデルのxy平面の中心からカメラをどのくらい遠ざければよいか（z軸のどの位置に置けばよいか）考える。
    // x軸y軸の長いほう(max_edge_xy)の半分をy、カメラの距離をxと置き、tanΘ=y/xを解く。
    // tanΘ=fov/2, y=max_edge_xy/2 となるので、あとは代入して式を解けばよい。
    const fov_rad = Math.tan((camera.fov / 2.0) / 180.0 * Math.PI);
    const max_edge_xy = Math.max(model_bbox.x, model_bbox.y);
    // バウンディングボックスの前面にカメラの焦点が合うように配置
    return ((max_edge_xy / 2.0) / fov_rad) + (model_bbox.z / 2);
}



// 
// main ここから
//

// GUI作成
const gui = setupGUI();

// レンダラーを作成
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector("#myCanvas"),
    //alpha: true,
    antialias: true
});
renderer.setSize(width, height);

// シーンを作成
scene = new THREE.Scene();

// カメラを作成
// new THREE.PerspectiveCamera(視野角, アスペクト比, near, far)
const camera = new THREE.PerspectiveCamera(45, width / height, 0.02, 1000);
// 焦点距離設定
camera.setFocalLength(50);
camera.position.set(0, 0, 2);
// カメラコントローラーを作成
const controls = new OrbitControls(camera, document.querySelector("#myCanvas"));
// 滑らかにカメラコントローラーを制御する
controls.enableDamping = true;
controls.dampingFactor = 0.1;


const material = createMatcapMaterial("../texture/matcap3.png");
//const material = createMeshPhongMaterial();

const fbxLoader = new FBXLoader();
var model_bbox = new THREE.Box3();
var model_bbox_size = new THREE.Vector3();
fbxLoader.load(
    '../model/Luna.fbx',
    (object) => {
        var bbox = []
        object.traverse( (child) => {
            if( child.isMesh ){
                child.material = material;
                if( child.material ){
                    child.material.transparent = false;
                }

                bbox.push(getBoundingBox(child));
            }
        });

        // オブジェクトの全パーツが収まるバウンディングボックスを作成
        const bbox_allmesh = calculateBoundingBoxFitAllMesh(bbox);
        bbox_allmesh.getSize(model_bbox_size);

        // 最大の辺が1になるようにモデルの大きさを正規化
        const max_edge = Math.max(model_bbox_size.x, model_bbox_size.y, model_bbox_size.z);
        var scale = {
          x: 1 / max_edge,
          y: 1 / max_edge,
          z: 1 / max_edge
        };
        object.scale.set(scale.x, scale.y, scale.z);

        // バウンディングボックスも正規化
        model_bbox = new THREE.Box3(bbox_allmesh.min.divideScalar(max_edge), bbox_allmesh.max.divideScalar(max_edge));
        model_bbox.getSize(model_bbox_size);

        // モデルの中心をセンターに移動
        const centre = new THREE.Vector3();
        model_bbox.getCenter(centre);
        object.position.set(-centre.x, -centre.y, -centre.z);

        // 一応各メッシュの法線を再計算
        object.traverse( (child) => {
            if( child.isMesh ){
                child.geometry.computeVertexNormals();
                child.geometry.normalizeNormals();
            }
        });
        
        // バウンディングボックスのワイヤフレーム表示
        const bbox_geometory = new THREE.BoxGeometry( model_bbox_size.x, model_bbox_size.y, model_bbox_size.z );
        const bbox_material = new THREE.MeshBasicMaterial( {color: 0x00FF00, wireframe: true} ); 
        const bbox_cube = new THREE.Mesh( bbox_geometory, bbox_material ); 
        bbox_cube.name = BOUNDING_BOX_FRAME_NAME;
        // ワイヤフレームはちょうど真ん中に設置されるので移動する必要なし
        //cube.position.set(-centre.x, -centre.y, -centre.z);
        scene.add( bbox_cube );
        
        // モデルが中心にあることを前提に、カメラがモデル全体を映すちょうどいいくらいの位置に調整
        const zpos = calculateCameraPosToFitModel(camera, model_bbox_size);
        camera.position.set(0, 0, zpos);

        scene.add(object);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.log(error);
    }
)

// 座標系表示
const axissize = 1;
scene.add(new THREE.AxesHelper(axissize));
// グリッド表示
const gridsize = 1;
const divisions = 0.2;
scene.add(new THREE.GridHelper(gridsize, divisions));


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
    // GUI更新
    gui.controllersRecursive().forEach((controller) => {
        controller.updateDisplay();
    });
    // カメラコントローラーを更新
    controls.update();
    // レンダリング
    renderer.render(scene, camera);

    requestAnimationFrame(tick);
}