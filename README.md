ZBrushで作成したモデルを表示するWebページ<br>
3Dプリント用モデルを試しに閲覧する想定<br>
モデルは単一のマテリアルで表示し、テクスチャは考慮しない<br>

**画面**
![Capture](capture.png)

個人用メモ<br>

**環境構築**<br>
$ npm install http-server<br>
$ http-server<br>

**ZBrush export files**<br>
1. 表示モデルを1つのサブツールにマージ<br>
   *Zplugin -> SubTool Master -> Merge*<br>
   MergeOnly にチェック<br>
2. *Zplugin -> DecimationMaster* でデシメーションかける<br>
   この時ある程度雑にデシメしておくと、サーバ公開した際にモデルを盗まれても直接問題なさそう<br>
   1 で一体化しているので型も考慮しない感じにしておくと〇<br>
3. *Zplugin -> FBX ExportImport* でモデルエクスポート<br>

**要調査**<br>
Three.js 内でロードするモデルを盗まれないようにするにはどうすればよいか？<br>
