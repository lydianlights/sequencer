import * as Konva from 'konva';
import { PolySynth, Synth, Transport, Part } from 'tone';
import { Note } from './../models/note';
import { Grid } from './../models/grid';
import { StyleSettings } from './../models/style-settings';

export class Main {
  private styles: StyleSettings = new StyleSettings({});

  private noteRangeMax: number = 12;
  private noteRangeMin: number = -12;
  private beatsPerMeasure: number = 4;
  private numMeasures: number = 2;
  private sidebarLayerWidth: number = 200;


  private grid: Grid;
  private sequencerHeight: number;
  private mainLayerWidth: number;
  private stage: Konva.Stage;

  private synth = new PolySynth(8, Synth).toMaster();
  private lastNoteAddedId: number = 0;
  private notes = {};
  private part: Part = new Part();

  constructor(containerId: string, styles: StyleSettings) {
    this.styles = styles;

    this.grid = new Grid(
      70,
      40,
      this.numMeasures * this.beatsPerMeasure * 2,
      this.noteRangeMax - this.noteRangeMin + 1,
      this.styles.gridColor
    );
    this.sequencerHeight = this.grid.getPixelHeight();
    this.mainLayerWidth = this.grid.getPixelWidth();

    this.initGUI(containerId);
    this.buildNotes();
  }

  private initGUI(containerId: string) {
    this.stage = new Konva.Stage({
      container: containerId,
      width: this.mainLayerWidth + this.sidebarLayerWidth,
      height: this.sequencerHeight
    });
    let mainLayer: Konva.Layer = this.initMainLayer();
    let sidebarLayer: Konva.Layer = this.initSideLayer();
    this.stage.add(mainLayer);
    this.stage.add(sidebarLayer);
  }

  private initMainLayer() {
    let mainLayer: Konva.Layer = new Konva.Layer({
      id: 'main-layer',
      x: this.sidebarLayerWidth
    });
    let bgGroup: Konva.Group = this.initBackgroundGroup();
    mainLayer.add(bgGroup);
    let notesGroup: Konva.Group = new Konva.Group({
      id: 'notes-group'
    });
    mainLayer.add(notesGroup);
    return mainLayer;
  }

  private initBackgroundGroup() {
    let bgGroup = new Konva.Group({
      id: 'background-group'
    });
    let bgRect = new Konva.Rect({
      x: 0,
      y: 0,
      width: this.stage.getWidth(),
      height: this.stage.getHeight(),
      fill: this.styles.bgColor
    });
    bgRect.on('click', this.addNoteToNoteGroup.bind(this));
    bgGroup.add(bgRect);
    this.grid.addToLayer(bgGroup);
    return bgGroup;
  }

  private initSideLayer() {
    // TODO: stuff
    let sidebarLayer: Konva.Layer = new Konva.Layer({
      id: 'sidebar-layer'
    });
    return sidebarLayer;
  }

  private buildNotes() {
    this.part.removeAll();
    let noteEvents = [];
    let keys = Object.keys(this.notes);
    keys.forEach((key)=>{
      let noteEvent = {time: this.notes[key].start, note: this.notes[key].pitch, dur: this.notes[key].length};
      noteEvents.push(noteEvent);
    });
    this.part = new Part((time, event)=>{
      this.synth.triggerAttackRelease(event.note, event.dur, time)
    }, noteEvents);
    this.part.start(0);
  }

  private addNoteToNoteGroup(note: Note, boxX: number, boxY: number) {
    let clickX = this.stage.getPointerPosition().x - this.sidebarLayerWidth;
    let clickY = this.stage.getPointerPosition().y;
    let clickXBox = Math.floor(clickX / this.grid.cellWidth);
    let clickYBox = Math.floor(clickY / this.grid.cellHeight);

    let clickedNote = Note.convertNumToString(this.noteRangeMax - clickYBox);
    let clickedTime = Note.convertEigthNoteNumToMeasureString(clickXBox);
    let newNote: Note = new Note(clickedNote, clickedTime, '8n');
    this.notes[this.lastNoteAddedId] = newNote;
    this.buildNotes();
    let notesGroup = this.stage.find('#notes-group')[0];
    let noteRect = new Konva.Rect({
      id: `${this.lastNoteAddedId}`,
      x: clickXBox * this.grid.cellWidth,
      y: clickYBox * this.grid.cellHeight,
      width: this.grid.cellWidth,
      height: this.grid.cellHeight,
      stroke: this.styles.noteBorderColor,
      strokeWidth: 1,
      fill: this.styles.noteColor
    });
    noteRect.on('click', this.removeNoteFromNoteGroup.bind(this));
    this.lastNoteAddedId++;
    notesGroup.add(noteRect);
    notesGroup.draw();
  }

  private removeNoteFromNoteGroup(event) {
    delete this.notes[event.target.attrs.id];
    event.target.destroy();
    this.buildNotes();
    this.stage.draw();
  }

  public playStop() {
    Transport.loopEnd = `0:${this.numMeasures * this.beatsPerMeasure}`;
    Transport.loop = true;
    if (Transport.state !== "started") {
      Transport.start('+0', 0);
    }
    else if (Transport.state !== "stopped") {
      Transport.stop();
    }
  }
}
