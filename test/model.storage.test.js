const { Model, Storage } = require('../lib');
const { expect, assert } = require('chai');
const randomString = require('randomstring');
const fs = require('fs');
const path = require('path');
const { Readable } = require("stream");
const uniqid = require('uniqid');
const { createCanvas } = require('canvas')

function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

describe('Model Storage', () => {
  const tmpDir = path.join(__dirname, './tmp');
  if (fs.existsSync(tmpDir))
    fs.rmdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(tmpDir);

  const s = Storage({
    secret: randomString.generate(32),
    root: path.join(__dirname, './tmp/storage')
  });

  const TestFileModel = Model(s, 'tests', Storage.schema);

  it('should get new id', async () => {
    const id = TestFileModel.id();
    expect(typeof id).to.be.equal('string');
  });

  it('should create a new file', async () => {
    const message = 'hello world';
    const rs = Readable.from([ message ]);

    const file = await TestFileModel.create({
      data: rs,
      type: 'text/plain'
    });

    const result = await streamToString(file.data);
    expect(file).to.have.property('data');
    expect(file).to.have.property('type', 'text/plain');
    expect(result).to.be.equal(message);
  });

  it('should create a new png file', async () => {
    const canvas = createCanvas(100, 100);
    const file = await TestFileModel.create({
      data: canvas.createPNGStream(),
      type: 'text/plain'
    });

    expect(file).to.have.property('data');
    expect(file).to.have.property('type', 'image/png');
  });

  it('should create a new file width specific name', async () => {
    const message = 'hello world';
    const rs = Readable.from([ message ]);

    const file = await TestFileModel.create({
      data: rs,
      name: 'hello',
      type: 'text/plain',
    });

    const result = await streamToString(file.data);
    expect(file).to.have.property('data');
    expect(file).to.have.property('name', 'hello');
    expect(file).to.have.property('type', 'text/plain');
    expect(result).to.be.equal(message);
  });

  it('should not create a new file because no data', async () => {
    try {
      await TestFileModel.create({
        type: 'text/plain'
      });
    } catch(err){
      expect(err.message).to.be.equal('No file data');
      return;
    }

    assert.fail();
  });

  it('should not create a new file because no type', async () => {
    try {
      const message = 'hello world';
      const rs = Readable.from([ message ]);

      await TestFileModel.create({
        data: rs,
      });
    } catch(err){
      expect(err.message).to.be.equal('Cannot detect file type');
      return;
    }

    assert.fail();
  });

  it('should create a new directory', async () => {
    const file = await TestFileModel.create({
      type: 'inode/directory'
    });

    expect(file).not.to.have.property('data');
    expect(file).to.have.property('type', 'inode/directory');
  });

  it('should create a new file width specific name and dir', async () => {
    const message = 'hello world';
    const rs = Readable.from([ message ]);

    const file = await TestFileModel.create({
      data: rs,
      name: 'hello',
      dir: 'foo/bar',
      type: 'text/plain',
    });

    const result = await streamToString(file.data);
    expect(file).to.have.property('data');
    expect(file).to.have.property('name', 'hello');
    expect(file).to.have.property('dir', 'foo/bar');
    expect(file).to.have.property('type', 'text/plain');
    expect(result).to.be.equal(message);
  });

  it('should not get non-exists file', async () => {
    const file = await TestFileModel.get(uniqid());
    expect(file).to.be.equal(null);
  });

  it('should list', async () => {
    const list = await TestFileModel.list();
    expect(list).to.have.property('total');
    expect(list).to.have.property('limit');
    expect(list).to.have.property('skip');
    expect(list).to.have.property('data');
  });

  it('should patch', async () => {
    const message = 'hello world';
    const rs = Readable.from([ message ]);

    const file = await TestFileModel.create({
      data: rs,
      name: 'patchme',
      type: 'text/plain',
    });

    const filePatched = await TestFileModel.patch(file._id, {
      name: 'me',
      dir: 'foo/bar',
      type: 'text/html'
    });

    const result = await streamToString(filePatched.data);
    expect(filePatched).to.have.property('data');
    expect(filePatched).to.have.property('name', 'me');
    expect(filePatched).to.have.property('dir', 'foo/bar');
    expect(filePatched).to.have.property('type', 'text/html');
    expect(result).to.be.equal(message);
  });

  it('should remove directory', async () => {
    const file1 = await TestFileModel.create({
      name: 'removeme',
      dir: '/foo',
      type: 'inode/directory'
    });

    const file = await TestFileModel.remove(file1._id);

    expect(file).not.to.have.property('data');
    expect(file).to.have.property('name', 'removeme');
    expect(file).to.have.property('dir', '/foo');
    expect(file).to.have.property('type', 'inode/directory');
  });

  it('should not patch non-exists file', async () => {
    const file = await TestFileModel.patch(uniqid(), {});
    expect(file).to.be.equal(null);
  });

  it('should not remove non-exists file', async () => {
    const file = await TestFileModel.remove(uniqid());
    expect(file).to.be.equal(null);
  });
});